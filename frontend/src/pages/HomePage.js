import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const { boards, status, error } = useSelector((state) => state.boards);

  if (status === 'loading') {
    return <div className="loader"></div>;
  }

  if (status === 'failed') {
    return <div className="error">Ошибка: {error}</div>;
  }

  // 🔴 ЗАЩИТА: если boards undefined — используем пустой массив
  const boardsList = boards || [];

  return (
    <div className="home">
      <h1 className="text-center mb-4">Добро пожаловать на ImagerBoard</h1>
      
      <div className="row">
        {boardsList.length > 0 ? (
          boardsList.map((board) => (
            <div key={board._id} className="col-md-4">
              <Link to={`/board/${board.code}`} style={{ textDecoration: 'none' }}>
                <div className="board-card">
                  <div className="board-title">
                    <span className="board-code">/{board.code}/</span> - {board.name}
                  </div>
                  <div className="board-description">{board.description}</div>
                  <div className="board-stats">
                    Тредов: {board.threadCount || 0}
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="col-12 text-center">
            <p className="text-muted">📭 Борды не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;