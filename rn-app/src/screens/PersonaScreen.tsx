import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import {useChatStore} from '../stores/chatStore';
import {personaAPI} from '../services/api';
import {Persona} from '../types';
import {DEFAULT_PERSONA, COLORS} from '../constants';
import PersonaCard from '../components/PersonaCard';

const PersonaScreen = () => {
  const {currentPersona, currentSessionId, setCurrentPersona, updateSessionPersona} = useChatStore();
  const [personas, setPersonas] = useState<Persona[]>([DEFAULT_PERSONA]);
  const [loading, setLoading] = useState(false);

  const loadPersonas = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await personaAPI.list();
      const apiPersonas = res.data || [];
      // 过滤掉与 DEFAULT_PERSONA 重名的角色，避免重复显示
      const filteredApiPersonas = apiPersonas.filter(
        (p: Persona) => p.name !== DEFAULT_PERSONA.name,
      );
      setPersonas([DEFAULT_PERSONA, ...filteredApiPersonas]);
    } catch {
      setPersonas([DEFAULT_PERSONA]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  const handleSelectPersona = useCallback(
    (persona: Persona) => {
      setCurrentPersona(persona);
      // 如果当前有活跃会话，同步更新该会话绑定的角色
      if (currentSessionId) {
        updateSessionPersona(currentSessionId, persona);
      }
    },
    [setCurrentPersona, currentSessionId, updateSessionPersona],
  );

  const renderItem = useCallback(
    ({item}: {item: Persona}) => (
      <PersonaCard
        persona={item}
        isSelected={currentPersona?.id === item.id}
        onPress={() => handleSelectPersona(item)}
      />
    ),
    [currentPersona, handleSelectPersona],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>角色人设</Text>
        <Text style={styles.headerSubtitle}>
          选择一个角色，AI 将以对应的风格回复你
        </Text>
      </View>

      {currentPersona && (
        <View style={styles.currentBar}>
          <View style={styles.currentAvatar}>
            <Text style={styles.currentIcon}>
              {currentPersona.avatar || currentPersona.name.charAt(0)}
            </Text>
          </View>
          <View style={styles.currentInfo}>
            <Text style={styles.currentLabel}>当前角色</Text>
            <Text style={styles.currentName}>{currentPersona.name}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>使用中</Text>
          </View>
        </View>
      )}

      <FlatList
        data={personas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无角色</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.darkPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.text.darkFaint,
  },
  currentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.accent.primaryHover,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.2)',
  },
  currentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.accent.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentIcon: {
    fontSize: 22,
  },
  currentInfo: {
    flex: 1,
  },
  currentLabel: {
    fontSize: 11,
    color: COLORS.accent.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  currentName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.darkPrimary,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(63,185,80,0.15)',
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 11,
    color: COLORS.semantic.success,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.darkFaint,
  },
});

export default PersonaScreen;
