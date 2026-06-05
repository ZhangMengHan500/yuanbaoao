import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RecordingListScreen from '../screens/RecordingListScreen';
import RecordingDetailScreen from '../screens/RecordingDetailScreen';

const Stack = createStackNavigator();

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {backgroundColor: '#F5F5F5'},
      }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RecordingList" component={RecordingListScreen} />
      <Stack.Screen name="RecordingDetail" component={RecordingDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStack;
