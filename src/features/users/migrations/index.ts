// Export all user-related migrations
export const migrations = [
  {
    name: '20250315150504_emerald_spring',
    description: 'Initial Schema Setup for HobbyMe',
    path: './20250315150504_emerald_spring.sql'
  },
  {
    name: '20250315153241_azure_ember',
    description: 'Add auth trigger for profile creation',
    path: './20250315153241_azure_ember.sql'
  },
  {
    name: '20250315155503_broken_butterfly',
    description: 'Fix authentication and profile creation',
    path: './20250315155503_broken_butterfly.sql'
  },
  {
    name: '20250317163128_holy_brook',
    description: 'Add admin role to profiles',
    path: './20250317163128_holy_brook.sql'
  },
  {
    name: '20250319160612_teal_canyon',
    description: 'Add admin policies for profile management',
    path: './20250319160612_teal_canyon.sql'
  },
  {
    name: '20250325165641_hidden_canyon',
    description: 'Add coordinates to profiles',
    path: './20250325165641_hidden_canyon.sql'
  },
  {
    name: '20250325171020_falling_shrine',
    description: 'Update all profiles to Liverpool',
    path: './20250325171020_falling_shrine.sql'
  }
];