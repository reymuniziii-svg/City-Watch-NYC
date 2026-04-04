export interface DonationTier {
  label: string;
  amount: number;
  url: string;
}

export interface DonationConfig {
  oneTime: DonationTier[];
  monthly: DonationTier[];
  customUrl: string;
}

const donationConfig: DonationConfig = {
  oneTime: [
    { label: '$5', amount: 5, url: '#' },
    { label: '$10', amount: 10, url: '#' },
    { label: '$25', amount: 25, url: '#' },
    { label: '$50', amount: 50, url: '#' },
  ],
  monthly: [
    { label: '$5/mo', amount: 5, url: '#' },
    { label: '$10/mo', amount: 10, url: '#' },
    { label: '$25/mo', amount: 25, url: '#' },
  ],
  customUrl: '#',
};

export default donationConfig;
