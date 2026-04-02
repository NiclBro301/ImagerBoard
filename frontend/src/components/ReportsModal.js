import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import './ReportsModal.css';

const ReportsModal = ({ user, onClose }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user?._id) {
      loadReports();
    }
  }, [user, page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await userService.getReports(user._id, { page, limit: 10 });
      setReports(response.data.reports);
      setTotalPages(response.data.pages);
      setTotalCount(response.data.total);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReasonText = (reason) => ({
    spam: '📢 Спам',
    offensive: '😤 Оскорбление',
    illegal: '⚖️ Незаконный контент',
    harassment: '🎯 Преследование',
    other: '❓ Другое',
  }[reason] || reason);

  const getStatusBadge = (status) => ({
    pending: { text: '⏳ Ожидает', color: '#ffc107', textColor: '#856404' },
    banned: { text: '🔨 Обработана', color: '#dc3545', textColor: '#721c24' },
    rejected: { text: '❌ Отклонена', color: '#6c757d', textColor: '#383d41' },
  }[status] || {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content reports-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Жалобы на: {user?.username}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="reports-summary">
            <div className="summary-stat">
              <span className="stat-number">{totalCount}</span>
              <span className="stat-label">Всего жалоб</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">{reports.filter(r => r.status === 'pending').length}</span>
              <span className="stat-label">В ожидании</span>
            </div>
            <div className="summary-stat">
              <span className="stat-number">{reports.filter(r => r.status === 'banned').length}</span>
              <span className="stat-label">Обработано</span>
            </div>
          </div>

          {loading ? (
            <div className="loader-container">
              <div className="loader"></div>
              <p>Загрузка жалоб...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h4>Нет жалоб</h4>
              <p>На этого пользователя нет жалоб</p>
            </div>
          ) : (
            <>
              <div className="reports-list">
                {reports.map((report, index) => {
                  const badge = getStatusBadge(report.status);
                  return (
                    <div key={report._id} className="report-item">
                      <div className="report-item-header">
                        <span className="report-id">#{totalCount - (page - 1) * 10 - index}</span>
                        <span className="report-date">
                          {new Date(report.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {badge && (
                          <span 
                            className="report-status-badge" 
                            style={{ 
                              backgroundColor: badge.color, 
                              color: badge.textColor 
                            }}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>
                      
                      <div className="report-item-content">
                        <div className="report-row">
                          <span className="report-label">Причина:</span>
                          <span className="report-value">{getReasonText(report.reason)}</span>
                        </div>
                        
                        {report.description && (
                          <div className="report-row">
                            <span className="report-label">Описание:</span>
                            <span className="report-value report-description">{report.description}</span>
                          </div>
                        )}
                        
                        <div className="report-row">
                          <span className="report-label">Пост:</span>
                          <span className="report-value report-post">
                            {report.post?.content?.substring(0, 150)}
                            {report.post?.content?.length > 150 ? '...' : ''}
                          </span>
                        </div>
                        
                        <div className="report-row">
                          <span className="report-label">Пожаловался:</span>
                          <span className="report-value">{report.user?.username || 'Аноним'}</span>
                        </div>

                        {report.status !== 'pending' && report.bannedBy && (
                          <div className="report-item-footer">
                            <span className="footer-item">
                              <strong>Обработал:</strong> {report.bannedBy.username}
                            </span>
                            {report.bannedAt && (
                              <span className="footer-item">
                                <strong>Дата:</strong> {new Date(report.bannedAt).toLocaleDateString('ru-RU')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="pagination-btn"
                  >
                    ← Назад
                  </button>
                  <span className="pagination-info">
                    Стр. {page} из {totalPages}
                  </span>
                  <button 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => p + 1)}
                    className="pagination-btn"
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;