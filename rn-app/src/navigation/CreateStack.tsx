import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {COLORS} from '../constants';
import CreateScreen from '../screens/CreateScreen';
import AiGenScreen from '../screens/AiGenScreen';
import AiEditScreen from '../screens/AiEditScreen';
import CosScreen from '../screens/CosScreen';
import Img2ImgScreen from '../screens/Img2ImgScreen';
import SmartEditScreen from '../screens/SmartEditScreen';
import AiImageGenScreen from '../screens/AiImageGenScreen';

// 创作页面导航参数类型
export type CreateStackParamList = {
  CreateHome: undefined;
  AiGen: {templateId?: string; stylePrompt?: string} | undefined;
  AiEdit: undefined;
  Cos: undefined;
  Img2Img: {templateId?: string; stylePrompt?: string; coverImage?: string; styleName?: string} | undefined;
  SmartEdit: undefined;
  AiImageGen: undefined;
};

const Stack = createNativeStackNavigator<CreateStackParamList>();

// 创作页面嵌套导航栈（与 ChatStack 同级结构）
const CreateStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: COLORS.dark.bg},
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
