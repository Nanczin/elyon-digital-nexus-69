import React from 'react';

/**
 * Processa texto da headline com asteriscos para destacar
 * Formato: *texto* para destacar com cor de destaque
 */
export const processHeadlineText = (text: string, highlightColor?: string): React.ReactNode => {
  if (!text) return text;
  
  // Regex para capturar texto entre asteriscos
  const highlightRegex = /\*(.*?)\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = highlightRegex.exec(text)) !== null) {
    // Adiciona texto antes do destaque
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Adiciona texto destacado com cor primária
    parts.push(
      React.createElement(
        'span',
        { 
          key: key++, 
          style: { color: highlightColor || '#3b82f6' } 
        },
        match[1]
      )
    );
    
    lastIndex = highlightRegex.lastIndex;
  }
  
  // Adiciona texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 1 ? React.createElement(React.Fragment, null, ...parts) : text;
};

/**
 * Formata tópicos removendo números no início e colocando em negrito o texto antes dos dois pontos
 */
export const formatTopicText = (topic: string): React.ReactNode => {
  if (!topic) return topic;
  
  // Remove números no início (ex: "1. ", "2. ", etc.)
  let cleanTopic = topic.replace(/^\d+\.\s*/, '');
  
  if (!cleanTopic.includes(':')) return cleanTopic;
  
  const colonIndex = cleanTopic.indexOf(':');
  const beforeColon = cleanTopic.slice(0, colonIndex);
  const afterColon = cleanTopic.slice(colonIndex);
  
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('strong', null, beforeColon),
    afterColon
  );
};

/**
 * Formata valor monetário para o padrão brasileiro R$0,00
 */
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'R$0,00';
  
  return `R$${numValue.toFixed(2).replace('.', ',')}`;
};

/**
 * Converte valor em reais para centavos
 */
export const toCents = (value: number): number => {
  return Math.round(value * 100);
};

/**
 * Converte valor em centavos para reais
 */
export const fromCents = (value: number): number => {
  return value / 100;
};