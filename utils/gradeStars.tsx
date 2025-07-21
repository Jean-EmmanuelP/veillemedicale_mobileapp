import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../assets/constants/colors';

export const renderGradeStars = (grade: string, size: number = 16, showText: boolean = false, textStyle?: any) => {
  const getStarCount = (grade: string) => {
    switch (grade.toUpperCase()) {
      case 'A': return 3;
      case 'B': return 2;
      case 'C': return 1;
      default: return 0;
    }
  };

  const starCount = getStarCount(grade);
  const stars = [];
  
  for (let i = 0; i < starCount; i++) {
    stars.push(
      <Ionicons 
        key={i} 
        name="star" 
        size={size} 
        color="#FFD700" 
        style={{ marginRight: 2 }} 
      />
    );
  }
  
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {stars}
      {showText && (
        <Text style={[{ marginLeft: 4, fontSize: 12, color: COLORS.textSecondary }, textStyle]}>
          Grade {grade}
        </Text>
      )}
    </View>
  );
}; 