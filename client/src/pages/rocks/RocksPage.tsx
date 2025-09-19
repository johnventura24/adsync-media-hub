import React from 'react';
import NinetyPage from '../../components/common/NinetyPage';

const RocksPage: React.FC = () => {
  return (
    <NinetyPage
      title="Rocks"
      subtitle="Manage your quarterly priorities and 90-day goals"
      showAddButton={true}
      onAddClick={() => console.log('Add rock clicked')}
    />
  );
};

export default RocksPage;
