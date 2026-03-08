import { registerPlugin } from '@capacitor/core';

export interface NativeSMSPlugin {
  sendSMS(options: { phones: string[]; message: string }): Promise<{ success: boolean }>;
  isAvailable(): Promise<{ available: boolean }>;
}

const NativeSMS = registerPlugin<NativeSMSPlugin>('NativeSMS');

export default NativeSMS;
