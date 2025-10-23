import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';

const CustomTabBar: React.FC<BottomTabBarProps> = (props) => {
  return <BottomTabBar {...props} />;
};

export default CustomTabBar;
