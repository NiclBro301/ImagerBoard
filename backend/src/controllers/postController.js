const Post = require('../models/Post');
const Thread = require('../models/Thread');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');

const cleanText = (text) => {
  if (!text) return text;
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
};

const findQuotedPost = async (threadId, content, currentUserId) => {
  try {
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('>') && !line.startsWith('>>')) {
        const quotedAuthor = line.replace(/^>\s*/, '').trim();
        
        const quoteTextLines = [];
        let j = i + 1;
        
        while (j < lines.length && lines[j].trim().startsWith('>')) {
          const quoteLine = lines[j].trim().replace(/^>\s*/, '');
          quoteTextLines.push(quoteLine);
          j++;
        }
        
        const quotedText = quoteTextLines.join(' ').trim();
        
        if (quotedAuthor && quotedText && quotedAuthor !== 'Аноним') {
          const quotedPost = await Post.findOne({
            thread: threadId,
            author: quotedAuthor,
            isDeleted: false
          })
          .sort({ createdAt: -1 })
          .populate('user');
          
          if (quotedPost) {
            if (quotedPost.content.includes(quotedText.substring(0, 30))) {
              if (currentUserId && quotedPost.user && 
                  quotedPost.user._id.toString() === currentUserId.toString()) {
                continue;
              }
              
              return {
                post: quotedPost,
                author: quotedAuthor,
                content: quotedText.substring(0, 100)
              };
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in findQuotedPost:', error);
    return null;
  }
};

const getPosts = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const thread = await Thread.findById(threadId);
    if (!thread || thread.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    const posts = await Post.find({ thread: threadId, isDeleted: false })
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'username')
      .lean();

    const count = await Post.countDocuments({
      thread: threadId,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении постов',
      error: error.message,
    });
  }
};

const createPost = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content, author } = req.body;

    const thread = await Thread.findById(threadId).populate('user');
    if (!thread || thread.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Тред не найден',
      });
    }

    const cleanedContent = cleanText(content);

    let image = null;
    if (req.file) {
      image = `/uploads/images/${req.file.filename}`;
    }

    const ipHash = req.user 
      ? null
      : crypto.createHash('sha256')
          .update(`${req.ip}|${req.headers['user-agent']}`)
          .digest('hex')
          .slice(0, 16);

    const postData = {
      thread: threadId,
      content: cleanedContent,
      author: req.user?.username || author || 'Аноним',
      image,
      user: req.user?._id || null,
      ipHash: ipHash,
    };

    const post = await Post.create(postData);
    await thread.incrementPostCount();

    let notificationSent = false;

    if (req.user) {
      const quoteInfo = await findQuotedPost(threadId, cleanedContent, req.user._id);
      
      if (quoteInfo && quoteInfo.post && quoteInfo.post.user) {
        try {
          await Notification.create({
            user: quoteInfo.post.user._id,
            type: 'quote',
            post: post._id,
            thread: thread._id,
            fromUser: req.user._id,
            title: 'Вас процитировали',
            message: `${req.user.username} процитировал ваш пост`,
            quotePreview: quoteInfo.content,
            metadata: {
              author: quoteInfo.author,
              originalContent: quoteInfo.content,
            },
          });
          notificationSent = true;
        } catch (notifError) {
          console.error('Error creating quote notification:', notifError);
        }
      }
    }

    if (!notificationSent && thread.user && thread.user._id.toString() !== (req.user?._id?.toString() || 'anonymous')) {
      await Notification.create({
        user: thread.user._id,
        type: 'reply',
        post: post._id,
        thread: thread._id,
        fromUser: req.user?._id || null,
        title: 'Новый ответ в вашем треде',
        message: `${post.author} ответил в треде "${thread.title}"`,
        quotePreview: cleanedContent.substring(0, 100),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Пост создан успешно',
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании поста',
      error: error.message,
    });
  }
};

const updatePost = async (req, res) => {
  try {
    const { content, author } = req.body;

    let post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    const cleanedContent = cleanText(content);

    post.content = cleanedContent || post.content;
    post.author = author || post.author;

    if (req.file) {
      post.image = `/uploads/images/${req.file.filename}`;
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Пост обновлён успешно',
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении поста',
      error: error.message,
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    const isAuthor = post.user && post.user._id.toString() === req.user._id.toString();
    const isAdminOrModerator = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isAuthor && !isAdminOrModerator) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для удаления этого поста',
      });
    }

    post.isDeleted = true;
    await post.save();

    const thread = await Thread.findById(post.thread);
    if (thread && thread.postCount > 1) {
      await thread.decrementPostCount();
    }

    res.status(200).json({
      success: true,
      message: 'Пост удалён успешно',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении поста',
      error: error.message,
    });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user');

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация для лайка',
      });
    }

    await post.like(req.user._id);

    if (post.user && post.user._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: post.user._id,
        type: 'like',
        post: post._id,
        thread: post.thread,
        fromUser: req.user._id,
        title: 'Новый лайк',
        message: `${req.user.username} лайкнул ваш пост`,
        quotePreview: post.content.substring(0, 100),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Пост лайкнут',
      likes: post.likes,
      likedBy: post.likedBy,
    });
  } catch (error) {
    if (error.message === 'Вы уже лайкали этот пост') {
      return res.status(400).json({
        success: false,
        message: 'Вы уже лайкали этот пост',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при лайке поста',
      error: error.message,
    });
  }
};

const unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Пост не найден',
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация для удаления лайка',
      });
    }

    await post.unlike(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Лайк убран',
      likes: post.likes,
      likedBy: post.likedBy,
    });
  } catch (error) {
    if (error.message === 'Вы не лайкали этот пост') {
      return res.status(400).json({
        success: false,
        message: 'Вы не лайкали этот пост',
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении лайка',
      error: error.message,
    });
  }
};

module.exports = {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
};