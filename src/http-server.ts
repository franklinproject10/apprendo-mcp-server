#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';

// Use the same Book interface and ApprendoServer class from your original server
interface Book {
  book_id: string;
  title: string;
  author: string;
  category: string;
  subtitle: string;
  summary: string;
  length: string;
  release_date: string;
  tier: string;
  has_summary: boolean;
  has_chapter_summaries: boolean;
  has_table_of_contents: boolean;
  table_of_contents?: Record<string, string>;
  chapter_summaries?: Record<string, string>;
}

class ApprendoHTTPServer {
  private books: Book[] = [];
  private server: Server;
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.server = new Server(
      {
        name: 'apprendo-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.loadBooks();
    this.setupHandlers();
    this.setupRoutes();
  }

  private loadBooks() {
    try {
      const booksPath = path.join(process.cwd(), 'data/books.json');
      const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
      this.books = booksData.books;
      console.log(`Loaded ${this.books.length} books`);
    } catch (error) {
      console.error('Failed to load books:', error);
      this.books = [];
    }
  }

  private setupHandlers() {
    // Same handlers as your original server
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_books',
          description: 'List all available books with their basic information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_book_summary',
          description: 'Get the main summary for a book',
          inputSchema: {
            type: 'object',
            properties: {
              book_id: {
                type: 'string',
                description: 'The unique identifier for the book',
              },
            },
            required: ['book_id'],
          },
        },
        {
          name: 'get_book_details',
          description: 'Get detailed information about a specific book',
          inputSchema: {
            type: 'object',
            properties: {
              book_id: {
                type: 'string',
                description: 'The unique identifier for the book',
              },
            },
            required: ['book_id'],
          },
        },
        {
          name: 'get_table_of_contents',
          description: 'Get the table of contents for a book with chapter descriptions',
          inputSchema: {
            type: 'object',
            properties: {
              book_id: {
                type: 'string',
                description: 'The unique identifier for the book',
              },
            },
            required: ['book_id'],
          },
        },
        {
          name: 'get_chapter_summary',
          description: 'Get the summary for a specific chapter of a book',
          inputSchema: {
            type: 'object',
            properties: {
              book_id: {
                type: 'string',
                description: 'The unique identifier for the book',
              },
              chapter_number: {
                type: 'integer',
                description: 'The chapter number to get summary for',
              },
            },
            required: ['book_id', 'chapter_number'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'list_books':
          return {
            content: [
              {
                type: 'text',
                text: this.books.map(book => ({
                  book_id: book.book_id,
                  title: book.title,
                  author: book.author,
                  category: book.category,
                  subtitle: book.subtitle,
                  summary: book.summary,
                  length: book.length,
                  release_date: book.release_date,
                  tier: book.tier,
                  has_summary: book.has_summary,
                  has_chapter_summaries: book.has_chapter_summaries,
                  has_table_of_contents: book.has_table_of_contents,
                })).map(book => JSON.stringify(book)).join('\n'),
              },
            ],
          };

        case 'get_book_summary':
          const book = this.books.find(b => b.book_id === request.params.arguments?.book_id);
          if (!book) {
            throw new Error(`Book with ID ${request.params.arguments?.book_id} not found`);
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  book_id: book.book_id,
                  title: book.title,
                  author: book.author,
                  summary: book.summary,
                }),
              },
            ],
          };

        case 'get_book_details':
          const detailBook = this.books.find(b => b.book_id === request.params.arguments?.book_id);
          if (!detailBook) {
            throw new Error(`Book with ID ${request.params.arguments?.book_id} not found`);
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(detailBook),
              },
            ],
          };

        case 'get_table_of_contents':
          const tocBook = this.books.find(b => b.book_id === request.params.arguments?.book_id);
          if (!tocBook) {
            throw new Error(`Book with ID ${request.params.arguments?.book_id} not found`);
          }
          return {
            content: [
              {
                type: 'text',
                text: this.formatTableOfContents(tocBook.table_of_contents || {}),
              },
            ],
          };

        case 'get_chapter_summary':
          const chapterBook = this.books.find(b => b.book_id === request.params.arguments?.book_id);
          if (!chapterBook) {
            throw new Error(`Book with ID ${request.params.arguments?.book_id} not found`);
          }
          
          const chapterNumber = request.params.arguments?.chapter_number;
          if (chapterNumber === undefined || chapterNumber === null) {
            throw new Error('Chapter number is required');
          }
          
          const chapterNum = chapterNumber.toString();
          const chapterSummary = chapterBook.chapter_summaries?.[chapterNum];
          
          if (!chapterSummary) {
            throw new Error(`Chapter ${chapterNum} not found for book ${request.params.arguments?.book_id}`);
          }
          
          return {
            content: [
              {
                type: 'text',
                text: chapterSummary,
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private formatTableOfContents(toc: Record<string, string>): string {
    return Object.entries(toc)
      .map(([chapter, description]) => `## ${chapter}\n${description}`)
      .join('\n\n');
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Apprendo MCP Server',
        status: 'running',
        books: this.books.length,
        version: '1.0.0'
      });
    });

    // MCP SSE endpoint
    this.app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/sse', res);
      await this.server.connect(transport);
    });
  }

  async start() {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      console.log(`Apprendo HTTP MCP server running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/`);
      console.log(`MCP endpoint: http://localhost:${port}/sse`);
    });
  }
}

const server = new ApprendoHTTPServer();
server.start().catch(console.error);