import React, { useState } from 'react';
import './BanModal.css';

const BanModal = ({ user, onClose, onBan, onUnban }) => {
  const [duration, setDuration] = useState('604800000'); // 7 дней по умолчанию
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const banData = {
      duration: isPermanent ? null : parseInt(duration),
      reason: reason || 'Нарушение правил',
    };
    onBan(banData);
  };

  const isBanned = user?.isActive === false;

  // Форматирование даты разбана
  const formatBanExpiry = (bannedUntil) => {
    if (!bannedUntil) return 'Перманентно';
    const date = new Date(bannedUntil);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Расчёт времени до разбана
  const getTimeUntilUnban = (bannedUntil) => {
    if (!bannedUntil) return '∞';
    const now = Date.now();
    const expiry = new Date(bannedUntil).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Истёк';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days} дн. ${remainingHours} ч.`;
    } else if (hours > 0) {
      return `${hours} ч. ${remainingHours} мин.`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} мин.`;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ban-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isBanned ? '🔒 Управление баном' : '🔨 Забанить пользователя'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="user-info-card">
            <div className="user-avatar-large">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <strong className="user-name">{user?.username}</strong>
              <span className="user-role-badge">{user?.role}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>

          {isBanned ? (
            // 🔹 Режим разбана
            <div className="ban-info-card">
              <div className="ban-status-banner">
                <span className="ban-icon">🔒</span>
                <span className="ban-status-text">Пользователь забанен</span>
              </div>

              <div className="ban-details">
                <div className="ban-detail-row">
                  <span className="label">Дата окончания:</span>
                  <span className="value">{formatBanExpiry(user?.bannedUntil)}</span>
                </div>
                <div className="ban-detail-row">
                  <span className="label">Осталось:</span>
                  <span className="value time-remaining">{getTimeUntilUnban(user?.bannedUntil)}</span>
                </div>
                {user?.banReason && (
                  <div className="ban-detail-row">
                    <span className="label">Причина:</span>
                    <span className="value">{user.banReason}</span>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-unban" 
                onClick={() => onUnban(user._id)}
                disabled={!user?._id}
              >
                ✅ Разбанить досрочно
              </button>
            </div>
          ) : (
            // 🔹 Режим выдачи бана
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Длительность бана:</label>
                <div className="duration-options">
                  <label className="duration-option">
                    <input 
                      type="radio" 
                      name="duration" 
                      value="3600000" 
                      checked={duration === '3600000' && !isPermanent} 
                      onChange={(e) => { setDuration(e.target.value); setIsPermanent(false); }}
                    />
                    <span>1 час</span>
                  </label>
                  <label className="duration-option">
                    <input 
                      type="radio" 
                      name="duration" 
                      value="86400000" 
                      checked={duration === '86400000' && !isPermanent} 
                      onChange={(e) => { setDuration(e.target.value); setIsPermanent(false); }}
                    />
                    <span>1 день</span>
                  </label>
                  <label className="duration-option">
                    <input 
                      type="radio" 
                      name="duration" 
                      value="604800000" 
                      checked={duration === '604800000' && !isPermanent} 
                      onChange={(e) => { setDuration(e.target.value); setIsPermanent(false); }}
                    />
                    <span>7 дней</span>
                  </label>
                  <label className="duration-option">
                    <input 
                      type="radio" 
                      name="duration" 
                      value="2592000000" 
                      checked={duration === '2592000000' && !isPermanent} 
                      onChange={(e) => { setDuration(e.target.value); setIsPermanent(false); }}
                    />
                    <span>30 дней</span>
                  </label>
                  <label className="duration-option permanent">
                    <input 
                      type="checkbox" 
                      checked={isPermanent} 
                      onChange={(e) => setIsPermanent(e.target.checked)}
                    />
                    <span>🚫 Перманентно</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Причина:</label>
                <select 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  className="form-select"
                  required
                >
                  <option value="">Выберите причину...</option>
                  <option value="spam">📢 Спам / Реклама</option>
                  <option value="offensive">😤 Оскорбление</option>
                  <option value="illegal">⚖️ Незаконный контент</option>
                  <option value="harassment">🎯 Преследование</option>
                  <option value="other">❓ Другое</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Комментарий модератора (опционально):</label>
                <textarea 
                  rows="3" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  className="form-textarea"
                  placeholder="Дополнительные заметки для других модераторов..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-danger">
                  🔨 Забанить
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BanModal;