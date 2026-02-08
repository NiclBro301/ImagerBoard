import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

// Защита маршрута по роли пользователя
const RoleRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  // Если не авторизован
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Если роль не разрешена
  if (!allowedRoles.includes(user?.role)) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger text-center">
          <h3>Доступ запрещен</h3>
          <p>У вас нет прав для просмотра этой страницы</p>
          <a href="/" className="btn btn-primary">Вернуться на главную</a>
        </div>
      </div>
    );
  }
  
  return children;
};

export default RoleRoute;