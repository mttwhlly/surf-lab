import { Metadata } from 'next';
import { LocationGate } from './components/LocationGate';

export const metadata: Metadata = {
  title: 'Can I Surf Today?',
  description: 'Real-time AI-powered surf reports for US surf spots. St. Augustine, Rockaway Beach, Huntington Beach, and more — updated 4 times daily.',
};

export default function RootPage() {
  return <LocationGate />;
}
