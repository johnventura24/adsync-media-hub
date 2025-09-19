import React from 'react';
import NinetyPage from '../../components/common/NinetyPage';

const TodosPage: React.FC = () => {
  return (
    <NinetyPage
      title="To-Dos"
      subtitle="Manage tasks, assignments, and action items"
      showAddButton={true}
      onAddClick={() => console.log('Add todo clicked')}
    />
  );
};

export default TodosPage;
