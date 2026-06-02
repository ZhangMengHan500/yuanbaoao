// Web stub for lottie-react-native — uses lottie-web
import React, {useEffect, useRef} from 'react';
import lottie from 'lottie-web';

interface LottieViewProps {
  source: any;
  autoPlay?: boolean;
  loop?: boolean;
  style?: any;
  onAnimationFinish?: () => void;
}

const LottieView: React.FC<LottieViewProps> = ({
  source,
  autoPlay = true,
  loop = true,
  style,
  onAnimationFinish,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay: autoPlay,
      animationData: source,
    });

    if (onAnimationFinish) {
      animRef.current.addEventListener('complete', onAnimationFinish);
    }

    return () => {
      animRef.current?.destroy();
    };
  }, [source, autoPlay, loop, onAnimationFinish]);

  return <div ref={containerRef} style={style} />;
};

export default LottieView;
