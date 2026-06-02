import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {COLORS} from '../constants';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RecordingListScreen from '../screens/RecordingListScreen';
import RecordingDetailScreen from '../screens/RecordingDetailScreen';

const Stack = createNativeStackNavigator();

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: COLORS.light.bg},
      }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RecordingList" component={RecordingListScreen} />
      <Stack.Screen name="RecordingDetail" component={RecordingDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStack;
