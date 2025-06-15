import type { Category, Entry, UserProfile } from '@/types';
import { FieldType, UserRole } from '@/types';

export const mockUsers: UserProfile[] = [
  { id: 'user-super', name: 'Super Admin', email: 'super@example.com', role: UserRole.SUPER_ADMIN, avatar: 'https://placehold.co/100x100.png?text=SA' },
  { id: 'user-sub', name: 'Sub Admin', email: 'sub@example.com', role: UserRole.SUB_ADMIN, avatar: 'https://placehold.co/100x100.png?text=SU' },
  { id: 'user-editor', name: 'Content Editor', email: 'editor@example.com', role: UserRole.SUB_ADMIN, avatar: 'https://placehold.co/100x100.png?text=ED' },
];

export const mockCategories: Category[] = [
  {
    id: 'cat-blog',
    name: 'Blog Posts',
    slug: 'blog-posts',
    description: 'Articles and news updates for the company blog.',
    fields: [
      { id: 'title', label: 'Title', type: FieldType.TEXT, required: true, placeholder: 'Enter blog post title' },
      { id: 'slug', label: 'Slug', type: FieldType.TEXT, required: true, placeholder: 'unique-url-slug' },
      { id: 'author', label: 'Author', type: FieldType.TEXT, placeholder: 'Author name' },
      { id: 'summary', label: 'Summary', type: FieldType.TEXTAREA, placeholder: 'A short summary of the post' },
      { id: 'content', label: 'Main Content', type: FieldType.TEXTAREA, required: true, placeholder: 'Write your blog post here...' },
      { id: 'coverImage', label: 'Cover Image URL', type: FieldType.TEXT, placeholder: 'https://example.com/image.jpg' },
      { id: 'isFeatured', label: 'Featured Post', type: FieldType.BOOLEAN },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-products',
    name: 'Products',
    slug: 'products',
    description: 'Information about company products.',
    fields: [
      { id: 'productName', label: 'Product Name', type: FieldType.TEXT, required: true, placeholder: 'Product Name' },
      { id: 'sku', label: 'SKU', type: FieldType.TEXT, required: true, placeholder: 'SKU-12345' },
      { id: 'price', label: 'Price', type: FieldType.NUMBER, required: true, placeholder: '99.99' },
      { id: 'description', label: 'Description', type: FieldType.TEXTAREA, placeholder: 'Detailed product description' },
      { id: 'inStock', label: 'In Stock', type: FieldType.BOOLEAN },
      { id: 'launchDate', label: 'Launch Date', type: FieldType.DATE },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockEntries: Entry[] = [
  {
    id: 'entry-blog-1',
    categoryId: 'cat-blog',
    title: 'The Future of AI in Content Management',
    data: {
      title: 'The Future of AI in Content Management',
      slug: 'future-of-ai-cms',
      author: 'Dr. AI Expert',
      summary: 'Exploring how artificial intelligence is reshaping content creation and management systems.',
      content: 'Detailed content about AI in CMS... AI can help with content generation, personalization, and analytics.',
      coverImage: 'https://placehold.co/600x400.png?text=AI+Future',
      isFeatured: true,
    },
    status: 'published',
    publishAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'entry-blog-2',
    categoryId: 'cat-blog',
    title: 'Understanding Next.js Server Components',
    data: {
      title: 'Understanding Next.js Server Components',
      slug: 'nextjs-server-components',
      author: 'Dev Advocate',
      summary: 'A deep dive into the architecture and benefits of Server Components in Next.js.',
      content: 'Server Components allow rendering UI on the server, reducing client-side JavaScript...',
      coverImage: 'https://placehold.co/600x400.png?text=NextJS',
      isFeatured: false,
    },
    status: 'draft',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'entry-product-1',
    categoryId: 'cat-products',
    title: 'SuperWidget Pro',
    data: {
      productName: 'SuperWidget Pro',
      sku: 'SWP-001',
      price: 199.99,
      description: 'The most advanced widget on the market, with features X, Y, and Z.',
      inStock: true,
      launchDate: new Date('2023-01-15').toISOString(),
    },
    status: 'published',
    publishAt: new Date('2023-01-15').toISOString(),
    createdAt: new Date('2023-01-01').toISOString(),
    updatedAt: new Date('2023-01-10').toISOString(),
  },
  {
    id: 'entry-product-2',
    categoryId: 'cat-products',
    title: 'EcoFriendly Gadget',
    data: {
      productName: 'EcoFriendly Gadget',
      sku: 'EFG-002',
      price: 79.50,
      description: 'A sustainable gadget made from recycled materials.',
      inStock: false,
      launchDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next month
    },
    status: 'scheduled',
    publishAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
