import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import CreateScreen from '../screens/CreateScreen';
import AiGenScreen from '../screens/AiGenScreen';
import AiEditScreen from '../screens/AiEditScreen';
import CosScreen from '../screens/CosScreen';
import Img2ImgScreen from '../screens/Img2ImgScreen';
import SmartEditScreen from '../screens/SmartEditScreen';
import AiImageGenScreen from '../screens/AiImageGenScreen';

// Web 版创作导航栈（使用 @react-navigation/stack，与 ChatStack.web.tsx 一致）
const Stack = createStackNavigator();

const CreateStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {backgroundColor: '#F5F5F5'},
      }}>
      <Stack.Screen name="CreateHome" component={CreateScreen} />
      <Stack.Screen name="AiGen" component={AiGenScreen} />
      <Stack.Screen name="AiEdit" component={AiEditScreen} />
      <Stack.Screen name="Cos" component={CosScreen} />
      <Stack.Screen name="Img2Img" component={Img2ImgScreen} />
      <Stack.Screen name="SmartEdit" component={SmartEditScreen} />
      <Stack.Screen name="AiImageGen" component={AiImageGenScreen} />
    </Stack.Navigator>
  );
};

export default CreateStack;
