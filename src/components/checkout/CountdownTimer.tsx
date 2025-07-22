
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
      <div className="w-full max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-red-50 border border-red-200">
          <Clock className="h-5 w-5 text-red-500" />
          <span className="text-red-700 font-medium text-lg">Oferta expirada!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div 
        className="flex items-center justify-center gap-4 px-8 py-4 rounded-lg border-2 shadow-lg animate-pulse"
        style={{ 
          borderColor: color,
          backgroundColor: color + '15',
          boxShadow: `0 4px 20px ${color}25`
        }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" style={{ color }} />
          <span className="font-medium text-gray-700 text-lg">{text}</span>
        </div>
        
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>
          {formatTime(timeLeft)}
        </div>
        
        <div className="text-sm text-gray-600">
          Não perca esta oportunidade!
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
