import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './CountrySelector.css';

interface CountrySelectorProps {
  selectedCountries: string[];
  countryLimit: number;
  onSave: (countries: string[]) => void;
}

export default function CountrySelector({ selectedCountries, countryLimit, onSave }: CountrySelectorProps) {
  const [available, setAvailable] = useState<{ code: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>(selectedCountries);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    supabase.from('countries').select('code, name').then(({ data }) => {
      if (data) setAvailable(data);
    });
  }, []);

  useEffect(() => {
    setSelected(selectedCountries);
  }, [selectedCountries]);

  const toggleCountry = (code: string) => {
    if (selected.includes(code)) {
      setSelected(selected.filter((c) => c !== code));
    } else if (selected.length < countryLimit) {
      setSelected([...selected, code]);
    }
  };

  const handleSave = () => {
    onSave(selected);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="country-selector-compact">
        <Globe className="country-selector-icon" />
        <div className="country-selector-badges">
          {selected.length === 0 ? (
            <span className="country-selector-empty">No countries selected</span>
          ) : (
            selected.map((code) => (
              <Badge key={code} variant="secondary" className="country-badge">
                {available.find((c) => c.code === code)?.name || code}
              </Badge>
            ))
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="country-selector-panel">
      <div className="country-selector-header">
        <h3 className="country-selector-title">
          Select Countries ({selected.length}/{countryLimit})
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="country-close-icon" />
        </Button>
      </div>
      <div className="country-selector-grid">
        {available.map((country) => (
          <button
            key={country.code}
            onClick={() => toggleCountry(country.code)}
            className={`country-option ${selected.includes(country.code) ? 'country-option-selected' : ''} ${
              !selected.includes(country.code) && selected.length >= countryLimit ? 'country-option-disabled' : ''
            }`}
            disabled={!selected.includes(country.code) && selected.length >= countryLimit}
          >
            {country.name}
          </button>
        ))}
      </div>
      <div className="country-selector-actions">
        <Button size="sm" onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
