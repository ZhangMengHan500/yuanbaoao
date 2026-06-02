import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Persona} from '../types';
import {COLORS} from '../constants';

interface Props {
  persona: Persona;
  isSelected: boolean;
  onPress: () => void;
}

const PersonaCard: React.FC<Props> = ({persona, isSelected, onPress}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.avatarContainer, isSelected && styles.avatarSelected]}>
        <Text style={styles.avatarText}>
          {persona.avatar || persona.name.charAt(0)}
        </Text>
      </View>

      <Text style={[styles.name, isSelected && styles.nameSelected]} numberOfLines={1}>
        {persona.name}
      </Text>

      {persona.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {persona.description}
        </Text>
      ) : null}

      {isSelected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    marginVertical: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.dark.border,
  },
  selected: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryHover,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarSelected: {
    backgroundColor: COLORS.accent.primaryLight,
  },
  avatarText: {
    fontSize: 26,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.darkPrimary,
    marginBottom: 4,
  },
  nameSelected: {
    color: COLORS.accent.primary,
  },
  description: {
    fontSize: 12,
    color: COLORS.text.darkFaint,
    textAlign: 'center',
    lineHeight: 17,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: COLORS.text.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default React.memo(PersonaCard);
