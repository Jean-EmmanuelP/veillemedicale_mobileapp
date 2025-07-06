import React, { useEffect, useRef } from "react";
import { View, Animated, Text, StyleSheet, Easing } from "react-native";

export default function LoaderS({ visible, overlayColor = "rgba(0,0,0,0.7)", size = 60 }) {
  const loaderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(loaderAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    } else {
      loaderAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: overlayColor }]}
      pointerEvents="auto"
    >
      <Animated.Text
        style={{
          color: "#fff",
          fontSize: size,
          fontWeight: "bold",
          letterSpacing: 2,
          transform: [
            {
              rotate: loaderAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        }}
      >
        S
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
}); 