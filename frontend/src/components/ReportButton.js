import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { reportService } from '../services/reportService';
import { toast } from 'react-toastify';
import './ReportButton.css';

const ReportButton = ({ postId, postAuthor }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('other');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Блокируем скролл когда модалка открыта
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showModal]);

  if (!isAuthenticated) {
    return null;
  }

  const reasons = [
    { value: 'spam', label: 'Спам / Реклама' },
    { value: 'offensive', label: 'Оскорбление / Троллинг' },
    { value: 'illegal', label: 'Незаконный контент' },
    { value: 'harassment', label: 'Преследование / Домогательство' },
    { value: 'other', label: 'Другое нарушение' },
  ];

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    await reportService.create({
      postId,
      reason,
      description,
    });

    setSuccess(true);
    toast.success('✅ Жалоба отправлена!', {
      position: 'top-right',
      autoClose: 3000,
    });
    
    setTimeout(() => {
      setShowModal(false);
      setSuccess(false);
    }, 2000);
  } catch (error) {
    console.error('Error creating report:', error);
    toast.error(error.response?.data?.message || '❌ Ошибка при отправке жалобы', {
      position: 'top-right',
      autoClose: 4000,
    });
  } finally {
    setSubmitting(false);
  }
};

  // 🔴 Рендерим модалку через Portal прямо в document.body
  const renderModal = () => {
    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Пожаловаться на пост</h3>
            <button 
              className="modal-close" 
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
          </div>

          {success ? (
            <div className="modal-success">
              <div className="success-icon">✅</div>
              <h4>Жалоба отправлена!</h4>
              <p>Модераторы рассмотрят вашу жалобу в ближайшее время.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Автор поста: <strong>{postAuthor || 'Аноним'}</strong></label>
              </div>

              <div className="form-group">
                <label htmlFor="reason">Причина жалобы *</label>
                <select
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-control"
                  required
                >
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Описание нарушения *</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-control"
                  rows="4"
                  placeholder="Опишите, в чём заключается нарушение..."
                  maxLength="500"
                  required
                ></textarea>
                <small className="form-text">
                  {description.length}/500 символов
                </small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  disabled={submitting}
                >
                  {submitting ? 'Отправка...' : 'Отправить жалобу'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <button 
        className="btn-report" 
        onClick={() => setShowModal(true)}
        title="Пожаловаться на пост"
      >
        ⚠️
      </button>

      {showModal && createPortal(renderModal(), document.body)}
    </>
  );
};

export default ReportButton;