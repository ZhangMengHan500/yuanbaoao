import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {COLORS} from '../constants';
import ChatScreen from '../screens/ChatScreen';
import HomeworkGradeScreen from '../screens/HomeworkGradeScreen';
import SmartEditScreen from '../screens/SmartEditScreen';
import RecordingScreen from '../screens/RecordingScreen';
import RecordingDetailScreen from '../screens/RecordingDetailScreen';
import PersonaScreen from '../screens/PersonaScreen';
import AiWriteScreen from '../screens/AiWriteScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import KnowledgeScreen from '../screens/KnowledgeScreen';
import DocReaderScreen from '../screens/doc-reader/DocReaderScreen';
import AiVideoGenScreen from '../screens/AiVideoGenScreen';
import AiExamScreen from '../screens/AiExamScreen';

const Stack = createStackNavigator();

const ChatStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {backgroundColor: COLORS.light.bg},
      }}>
      <Stack.Screen name="ChatRoom" component={ChatScreen} />
      <Stack.Screen name="HomeworkGrade" component={HomeworkGradeScreen} />
      <Stack.Screen name="SmartEdit" component={SmartEditScreen} />
      <Stack.Screen name="Recording" component={RecordingScreen} />
      <Stack.Screen name="RecordingDetail" component={RecordingDetailScreen} />
      <Stack.Screen name="Persona" component={PersonaScreen} />
      <Stack.Screen name="AiWrite" component={AiWriteScreen} />
      <Stack.Screen name="VoiceCall" component={VoiceCallScreen} />
      <Stack.Screen name="Knowledge" component={KnowledgeScreen} />
      <Stack.Screen name="DocReader" component={DocReaderScreen} />
      <Stack.Screen name="AiVideoGen" component={AiVideoGenScreen} />
      <Stack.Screen name="AiExam" component={AiExamScreen} />
    </Stack.Navigator>
  );
};

export default ChatStack;
