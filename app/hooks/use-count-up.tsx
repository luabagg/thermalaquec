import { useEffect, useRef, useState, useCallback } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number; // em milissegundos
  startOnInView?: boolean; // se deve iniciar quando o componente estiver visível
  inView?: boolean; // estado atual de visibilidade do observador
}

export const useCountUp = ({ end, duration = 2000, startOnInView = false, inView = true }: UseCountUpOptions) => {
  const [count, setCount] = useState(0);
  const animationFrameId = useRef<number | null>(null); // Para armazenar o ID do requestAnimationFrame
  const startTimeRef = useRef<number>();

  // Função para parar a animação
  const stopAnimation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  // O loop da animação
  const animate = useCallback((currentTime: number) => {
    if (startTimeRef.current === undefined) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const currentCount = Math.floor(progress * end);

    setCount(currentCount);

    if (progress < 1) {
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      stopAnimation(); // Animação finalizada
    }
  }, [end, duration, stopAnimation]); // animate depende de end, duration e stopAnimation

  // Efeito para limpar a animação quando o componente é desmontado
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  // Efeito para controlar o início e a parada da animação
  useEffect(() => {
    const shouldStart = startOnInView ? inView : true;

    if (shouldStart && animationFrameId.current === null) { // Iniciar apenas se não estiver rodando
      setCount(0); // Resetar a contagem antes de iniciar uma nova animação
      startTimeRef.current = undefined; // Resetar o tempo de início
      animationFrameId.current = requestAnimationFrame(animate);
    } else if (!shouldStart && animationFrameId.current !== null) {
      // Se deve parar (ex: saiu da visualização)
      stopAnimation();
      setCount(0); // Resetar a contagem quando parado
    }
  }, [end, duration, inView, startOnInView, animate, stopAnimation]);

  return count;
};