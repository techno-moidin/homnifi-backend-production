import { INestApplicationContext, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { Support } from '../support/schemas/support.schema';

const data = [
  {
    name: 'KMALL',
    icon: 'kmall-icon.svg',
    logo: 'kmall-logo.png',
    link: 'https://support.kmall.io/',
    background: 'kmall-bg.png',
  },
  {
    name: 'Journey Bridge',
    icon: 'jb-icon.svg',
    logo: 'jb-logo.png',
    link: 'https://support.journeybridge.io/',
    background: 'jb-bg.png',
  },
  {
    name: 'NeoOne',
    icon: 'neo-icon.svg',
    logo: 'neo-logo.png',
    link: 'https://myneoone.freshdesk.com/',
    background: 'neo-bg.png',
  },
  {
    name: 'Quantwise',
    icon: 'quantwise-icon.svg',
    logo: 'quantwise-logo.png',
    link: 'https://support.quantwise.ai/',
    background: 'quantwise-bg.png',
  },
  {
    name: 'Rampstarter',
    icon: 'rs-icon.svg',
    logo: 'rs-logo.png',
    link: 'https://support.rampstarter.com/',
    background: 'rs-bg.png',
  },
  {
    name: 'WalleK',
    icon: 'wallek-icon.svg',
    logo: 'wallek-logo.png',
    link: 'https://support.wallek.io/',
    background: 'wallek-bg.png',
  },
  {
    name: 'Xera',
    icon: 'xera-icon.svg',
    logo: 'xera-logo.png',
    link: 'https://support.xera.pro/',
    background: 'xera-bg.png',
  },
  {
    name: 'Zenit',
    icon: 'zenit-icon.svg',
    logo: 'zenit-logo.png',
    link: 'https://support.zenit.world/',
    background: 'zenit-bg.png',
  },
];

export async function seedSupports(appContext: INestApplicationContext) {
  const logger = new Logger();

  const supportModel = appContext.get<Model<Support>>(Support.name + 'Model');
  const supports = data.map((item, index) => ({
    ...item,
    ordinator: index + 1,
  }));
  try {
    await supportModel.create(supports);
  } catch (e) {
    logger.error(`Error while seeding support`);
  }
}
