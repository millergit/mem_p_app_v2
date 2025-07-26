export interface FrequencySettings {
  maxPerHour: number;
  maxPerDay: number;
  enabled: boolean;
}

export interface ContactFrequencySettings {
  calls: FrequencySettings;
  texts: FrequencySettings;
  voicemailAllowed: number; // How many blocked calls can leave voicemail before complete blocking
  quietHours?: {
    start: string;
    end: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  birthdate: string;
  photoUri?: string;
  frequencySettings?: ContactFrequencySettings;
}