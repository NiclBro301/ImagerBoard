import React from 'react';
import { useSelector } from 'react-redux';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="admin-page">
      <h2>Панель модерации</h2>
      
      <div className="card">
        <h4>Добро пожаловать, {user?.username || 'Модератор'}!</h4>
        <p>Здесь будет панель управления бордами, тредами и постами.</p>
      </div>

      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card">
            <h5>Управление бордами</h5>
            <button className="btn btn-primary mt-2">Добавить борд</button>
            <button className="btn btn-outline mt-2">Редактировать борды</button>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <h5>Модерация</h5>
            <button className="btn btn-outline mt-2">Отчеты</button>
            <button className="btn btn-outline mt-2">Баны</button>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <h5>Статистика</h5>
            <button className="btn btn-outline mt-2">Просмотр статистики</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;