import { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Animated, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🤝',
    headline: 'Meet people who read\nexactly like you',
    sub: 'No more random book clubs.\nJust your kind of readers.',
    bg: '#FEFAF4',
  },
  {
    emoji: '🎯',
    headline: 'Get matched with\n5–7 readers',
    sub: 'We group you based on taste,\npace, and vibe.',
    bg: '#F4F9F6',
  },
  {
    emoji: '💬',
    headline: 'No group chat chaos',
    sub: 'Guided prompts unlock\nas you read.',
    bg: '#F7F4FE',
  },
  {
    emoji: '📖',
    headline: 'Your next favorite book\nis waiting',
    sub: 'Takes less than 60 seconds\nto get matched.',
    bg: '#FEF6F4',
  },
];

export default function OnboardingIntro() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setActiveIndex(idx);
    }
  };

  const handleContinue = () => {
    if (activeIndex < SLIDES.length - 1) {
      goTo(activeIndex + 1);
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  return (
    <View style={[s.root, { backgroundColor: slide.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={s.scroll}
      >
        {SLIDES.map((sl, i) => (
          <Animated.View
            key={i}
            style={[s.slide, { width, opacity: i === activeIndex ? fadeAnim : 1, backgroundColor: sl.bg }]}
          >
            <View style={s.emojiWrap}>
              <Text style={s.emoji}>{sl.emoji}</Text>
            </View>
            <Text style={s.headline}>{sl.headline}</Text>
            <Text style={s.sub}>{sl.sub}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[s.dot, i === activeIndex && s.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[s.btn, isLast && s.btnFinal]} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={s.btnTxt}>{isLast ? 'Find my book club →' : 'Continue'}</Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={() => router.replace('/(auth)/welcome')} style={s.skipWrap}>
            <Text style={s.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  slide: {
    flex: 1,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 160,
  },
  emojiWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 6,
  },
  emoji: { fontSize: 52 },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 17,
    color: '#6B5A4E',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 52,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 18,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D9CEC4',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#2D6A4F',
    borderRadius: 4,
  },
  btn: {
    width: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnFinal: {
    backgroundColor: '#D4874E',
    shadowColor: '#D4874E',
  },
  btnTxt: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  skipWrap: { paddingVertical: 4 },
  skip: {
    color: '#A89B8C',
    fontSize: 15,
    fontWeight: '500',
  },
});
