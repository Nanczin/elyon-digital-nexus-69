import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { formatTopicText } from '@/utils/textFormatting';

interface Package {
  id: number;
  name: string;
  description: string;
  topics: string[];
  price: number;
  originalPrice: number;
  mostSold?: boolean;
}

interface PackageSelectorProps {
  packages: Package[];
  selectedPackage?: number;
  onSelectPackage: (packageId: number) => void;
  primaryColor: string;
  textColor: string;
}

const PackageSelector: React.FC<PackageSelectorProps> = ({
  packages,
  selectedPackage,
  onSelectPackage,
  primaryColor,
  textColor
}) => {
  const [expandedPackages, setExpandedPackages] = useState<Set<number>>(new Set());

  const toggleExpanded = (packageId: number) => {
    const newExpanded = new Set(expandedPackages);
    if (newExpanded.has(packageId)) {
      newExpanded.delete(packageId);
    } else {
      newExpanded.add(packageId);
    }
    setExpandedPackages(newExpanded);
  };

  // Filtrar apenas pacotes com conteúdo válido, mas permitir pacotes em edição
  const validPackages = packages.filter(pkg => {
    // Se o pacote tem nome, sempre mostrar (está sendo editado)
    if (pkg.name && pkg.name.trim()) return true;
    
    // Se não tem nome mas tem tópicos válidos, mostrar
    if (pkg.topics && pkg.topics.length > 0 && pkg.topics.some(topic => topic.trim())) return true;
    
    // Se é um pacote vazio mas há apenas um pacote, mostrar (caso inicial)
    if (packages.length === 1) return true;
    
    // Para múltiplos pacotes, mostrar se pelo menos tem ID (foi criado intencionalmente)
    return pkg.id > 0;
  });

  console.log('PackageSelector Debug:', {
    totalPackages: packages.length,
    validPackages: validPackages.length,
    packages: packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      hasTopics: pkg.topics?.length > 0,
      hasValidTopics: pkg.topics?.some(topic => topic.trim())
    }))
  });

  if (validPackages.length === 0) return null;

  return (
    <div className="space-y-8">
      
      <RadioGroup 
        value={selectedPackage?.toString()} 
        onValueChange={(value) => {
          console.log('RadioGroup onChange:', value, typeof value);
          onSelectPackage(parseInt(value));
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
      >
        {validPackages.map((pkg) => {
          const isSelected = selectedPackage === pkg.id;
          
          return (
            <div 
              key={pkg.id}
              className={`relative cursor-pointer transition-all duration-300 h-full rounded-2xl overflow-hidden ${
                isSelected 
                  ? 'scale-[1.03] shadow-2xl' 
                  : 'hover:scale-[1.01] hover:shadow-xl'
              }`}
            >
              <input
                type="radio"
                id={`package-${pkg.id}`}
                name="package-selection"
                value={pkg.id}
                checked={isSelected}
                onChange={() => onSelectPackage(pkg.id)}
                className="sr-only"
              />
              <label 
                htmlFor={`package-${pkg.id}`}
                className={`relative rounded-2xl p-8 bg-white backdrop-blur-sm transition-all duration-300 border-2 flex flex-col cursor-pointer block h-full ${
                  isSelected ? 'border-2 shadow-lg' : 'border-gray-100 hover:border-gray-200'
                }`}
                style={{
                  borderColor: isSelected ? primaryColor : undefined,
                  boxShadow: isSelected ? `0 20px 40px -12px ${primaryColor}20` : undefined
                }}
              >
                {/* Badge destacado para pacote selecionado */}
                {isSelected && (
                  <div 
                    className="absolute top-2 right-2 px-3 py-1 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Selecionado
                  </div>
                )}

                {/* Badge "Mais Vendido" */}
                {pkg.mostSold && !isSelected && (
                  <div 
                    className="absolute top-0 left-0 px-3 py-1 rounded-br-xl rounded-tl-2xl text-white text-xs font-bold"
                    style={{ backgroundColor: '#f59e0b' }}
                  >
                    🔥 MAIS VENDIDO
                  </div>
                )}

                {/* Header com Radio Button visual e Nome */}
                <div className="flex items-start gap-6 mb-8">
                  <div className="mt-2">
                    <div 
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-2' : 'border-gray-300'
                      }`}
                      style={{ borderColor: isSelected ? primaryColor : undefined }}
                    >
                      {isSelected && (
                        <div 
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <span 
                      className="text-2xl font-bold block leading-tight"
                      style={{ color: textColor }}
                    >
                      {pkg.name || `Pacote ${pkg.id}`}
                    </span>
                  </div>
                </div>
                
                {/* Preços */}
                <div className="flex items-baseline gap-4 mb-8">
                  <span 
                    className="text-5xl font-black tracking-tight"
                    style={{ color: primaryColor }}
                  >
                    R${pkg.price.toFixed(2).replace('.', ',')}
                  </span>
                  {pkg.originalPrice > 0 && pkg.originalPrice !== pkg.price && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xl text-gray-400 line-through">
                        R${pkg.originalPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span 
                        className="text-sm font-semibold px-3 py-2 rounded-full text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% OFF
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Descrição */}
                {pkg.description && (
                  <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                    {pkg.description}
                  </p>
                )}
                
                {/* Botão "Ver o que está incluso" */}
                {pkg.topics && pkg.topics.length > 0 && pkg.topics.some(topic => topic.trim()) && (
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpanded(pkg.id);
                      }}
                      className="flex items-center gap-3 text-base font-medium mb-8 transition-all duration-200 hover:opacity-70"
                      style={{ color: primaryColor }}
                    >
                      Ver o que está incluso
                      {expandedPackages.has(pkg.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Conteúdo expansível */}
                    {expandedPackages.has(pkg.id) && (
                      <div className="space-y-6 animate-fade-in bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-gray-100">
                        <ul className="space-y-4">
                          {pkg.topics.filter(topic => topic.trim()).map((topic, topicIndex) => (
                            <li key={topicIndex} className="flex items-start gap-4">
                              <div className="mt-1 flex-shrink-0 p-2 rounded-full" style={{ backgroundColor: `${primaryColor}15` }}>
                                <Check 
                                  className="w-5 h-5"
                                  style={{ color: primaryColor }}
                                />
                              </div>
                              <span className="text-gray-700 text-lg leading-relaxed flex-1 font-medium">
                                {formatTopicText(topic)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Spacer para ocupar o restante do espaço */}
                <div className="flex-1"></div>
              </label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default PackageSelector;