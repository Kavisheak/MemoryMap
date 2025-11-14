import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ 
        title:"Map",
        tabBarIcon: ({color})=>  <FontAwesome5 name="map-marked-alt" size={24} color={color} />

      }} />
      <Tabs.Screen name="memories" options={{ 
        title:"Memories", 
        tabBarIcon: ({color})=> <MaterialIcons name="add-to-photos" size={24} color={color} />
        
        }} />
        <Tabs.Screen name='settings' options={{
          title:"Settings",
          tabBarIcon: ({color})=> <MaterialIcons name="settings" size={24} color={color} />
          }}/>

      
    </Tabs>
  );
}
