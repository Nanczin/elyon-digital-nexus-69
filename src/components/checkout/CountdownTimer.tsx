import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  duration: number; // em minutos
  color: string;
  text: string;
}

const CountdownTimer = ({ duration, color, text }: CountdownTimerProps) => {
  console.log('CountdownTimer renderizado com:', { duration, color, text });
  const [timeLeft, setTimeLeft] = useState(duration * 60); // converter para segundos

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (timeLeft <= 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-4 sm:mb-6"> {/* Ajustado mb */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-lg bg-red-50 border border-red-200"> {/* Ajustado gap, px, py */}
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" /> {/* Ajustado h, w */}
          <span className="text-red-700 font-medium text-base sm:text-lg">Oferta expirada!</span> {/* Ajustado text size */}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-4 sm:mb-6"> {/* Ajustado mb */}
      <div 
        className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4 sm:px-8 py-3 sm:py-4 rounded-lg border-2 shadow-lg animate-pulse" {/* Ajustado flex, gap, px, py */}
        style={{ 
          borderColor: color,
          backgroundColor: color + '15',
          boxShadow: `0 4px 20px ${color}25`
        }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} /> {/* Ajustado h, w */}
          <span className="font-medium text-gray-700 text-base sm:text-lg">{text}</span> {/* Ajustado text size */}
        </div>
        
        <div className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color }}> {/* Ajustado text size */}
          {formatTime(timeLeft)}
        </div>
        
        <div className="text-xs sm:text-sm text-gray-600"> {/* Ajustado text size */}
          Não perca esta oportunidade!
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;