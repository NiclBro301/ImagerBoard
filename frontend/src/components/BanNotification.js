import React from 'react';
import './BanNotification.css';

const BanNotification = ({ bannedUntil, isPermanent, onLogout }) => {
  return (
    <div className="ban-notification">
      <div className="ban-icon">🚫</div>
      <h3>Ваш аккаунт забанен</h3>
      <p className="ban-reason">
        {isPermanent 
          ? 'Ваш аккаунт забанен навсегда за нарушение правил.'
          : `Ваш аккаунт временно забанен до ${new Date(bannedUntil).toLocaleString('ru-RU')}`
        }
      </p>
      <p className="ban-message">
        Если вы считаете, что бан был выдан ошибочно, обратитесь к администрации.
      </p>
      <button className="btn-logout" onClick={onLogout}>
        Выйти из системы
      </button>
    </div>
  );
};

export default BanNotification;