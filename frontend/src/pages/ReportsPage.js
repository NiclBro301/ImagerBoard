import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { reportService } from '../services/reportService';
import './ReportsPage.css';

const ReportsPage = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'moderator')) {
      loadReports();
    }
  }, [isAuthenticated, user, filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await reportService.getAll({ status: filter });
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId) => {
    if (!window.confirm('Вы уверены, что хотите разрешить эту жалобу?')) {
      return;
    }

    try {
      await reportService.resolve(reportId);
      loadReports();
      alert('Жалоба разрешена!');
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Ошибка при разрешении жалобы');
    }
  };

  const handleReject = async (reportId) => {
    if (!window.confirm('Вы уверены, что хотите отклонить эту жалобу?')) {
      return;
    }

    try {
      await reportService.reject(reportId);
      loadReports();
      alert('Жалоба отклонена!');
    } catch (error) {
      console.error('Error rejecting report:', error);
      alert('Ошибка при отклонении жалобы');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ В ожидании', color: '#ffc107' },
      resolved: { text: '✅ Разрешена', color: '#28a745' },
      rejected: { text: '❌ Отклонена', color: '#dc3545' },
    };
    return badges[status] || badges.pending;
  };

  const getReasonText = (reason) => {
    const reasons = {
      spam: 'Спам',
      offensive: 'Оскорбление',
      illegal: 'Незаконный контент',
      other: 'Другое',
    };
    return reasons[reason] || reason;
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'moderator')) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          У вас нет доступа к этой странице
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>📋 Система жалоб</h1>
        <div className="filter-tabs">
          <button
            className={`tab-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            В ожидании ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            className={`tab-btn ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Разрешенные
          </button>
          <button
            className={`tab-btn ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Отклоненные
          </button>
          <button
            className={`tab-btn ${filter === '' ? 'active' : ''}`}
            onClick={() => setFilter('')}
          >
            Все
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loader"></div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Нет жалоб</h3>
          <p>Все жалобы рассмотрены или их пока нет</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => {
            const badge = getStatusBadge(report.status);
            return (
              <div key={report._id} className="report-card">
                <div className="report-header">
                  <div className="report-badge" style={{ backgroundColor: badge.color }}>
                    {badge.text}
                  </div>
                  <span className="report-date">
                    {new Date(report.createdAt).toLocaleString('ru-RU')}
                  </span>
                </div>

                <div className="report-content">
                  <div className="report-info">
                    <strong>Пост:</strong>
                    <div className="post-preview">
                      <p>{report.post?.content?.substring(0, 100)}...</p>
                      <small>Автор: {report.post?.author || 'Аноним'}</small>
                    </div>
                  </div>

                  <div className="report-info">
                    <strong>Причина:</strong>
                    <span>{getReasonText(report.reason)}</span>
                  </div>

                  {report.description && (
                    <div className="report-info">
                      <strong>Описание:</strong>
                      <p>{report.description}</p>
                    </div>
                  )}

                  <div className="report-info">
                    <strong>Отправил:</strong>
                    <span>{report.reportedBy}</span>
                  </div>

                  {report.resolvedBy && (
                    <div className="report-info">
                      <strong>Рассмотрел:</strong>
                      <span>{report.resolvedBy.username}</span>
                    </div>
                  )}

                  {report.resolvedAt && (
                    <div className="report-info">
                      <strong>Дата решения:</strong>
                      <span>{new Date(report.resolvedAt).toLocaleString('ru-RU')}</span>
                    </div>
                  )}
                </div>

                {report.status === 'pending' && (
                  <div className="report-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => handleResolve(report._id)}
                    >
                      ✅ Разрешить
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReject(report._id)}
                    >
                      ❌ Отклонить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;