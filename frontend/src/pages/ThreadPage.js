import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { postService } from '../services/postService';

const ThreadPage = () => {
  const { threadId } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [threadId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await postService.getAll(threadId);
      setPosts(response.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loader"></div>;
  }

  return (
    <div className="thread-page">
      <Link to="/" className="btn btn-outline mb-3">
        ← Назад к бордам
      </Link>

      {posts.map((post) => (
        <div key={post._id} className="post-card">
          <div className="post-header">
            <div>
              <strong>Аноним</strong>
              <span className="post-meta"> • {new Date(post.createdAt).toLocaleString()}</span>
            </div>
            <div className="post-actions">
              <button className="btn btn-outline btn-sm">Ответить</button>
              <button className="btn btn-outline btn-sm">Цитировать</button>
            </div>
          </div>
          <div className="post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
          {post.image && <img src={post.image} alt="Пост" className="post-image" />}
        </div>
      ))}

      <div className="card mt-4">
        <h4>Ответить в тред</h4>
        <textarea className="form-control" rows="4" placeholder="Ваш сообщение..." />
        <input type="file" className="form-control mt-2" accept="image/*" />
        <button className="btn btn-primary mt-2">Отправить</button>
      </div>
    </div>
  );
};

export default ThreadPage;