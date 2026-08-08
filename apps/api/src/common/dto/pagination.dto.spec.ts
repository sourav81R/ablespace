import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { buildPaginationMeta, PaginationQueryDto, skipFor } from './pagination.dto';

describe('PaginationQueryDto', () => {
  /** Mirrors how the global ValidationPipe is configured in main.ts. */
  function parse(query: Record<string, unknown>): {
    dto: PaginationQueryDto;
    errors: string[];
  } {
    const dto = plainToInstance(PaginationQueryDto, query);
    const errors = validateSync(dto).flatMap((error) => Object.values(error.constraints ?? {}));
    return { dto, errors };
  }

  it('applies defaults when nothing is supplied', () => {
    const { dto, errors } = parse({});

    expect(errors).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(25);
  });

  it('coerces numeric query strings', () => {
    // Query parameters always arrive as strings; @Type(() => Number) converts.
    const { dto, errors } = parse({ page: '3', limit: '50' });

    expect(errors).toEqual([]);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it('rejects a limit above the cap', () => {
    // The cap stops a caller pulling the whole collection in one request.
    const { errors } = parse({ limit: '500' });

    expect(errors.join(' ')).toContain('limit cannot exceed 100');
  });

  it('rejects a page below 1', () => {
    const { errors } = parse({ page: '0' });

    expect(errors.join(' ')).toContain('page must be at least 1');
  });

  it('rejects non-integer values', () => {
    const { errors } = parse({ page: 'abc' });

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('skipFor', () => {
  it('computes the document offset for a page', () => {
    expect(skipFor(3, 10)).toBe(20);
  });

  it('skips nothing on the first page', () => {
    expect(skipFor(1, 25)).toBe(0);
  });
});

describe('buildPaginationMeta', () => {
  it('computes the total page count', () => {
    expect(buildPaginationMeta(1, 25, 100)).toEqual({
      page: 1,
      limit: 25,
      total: 100,
      totalPages: 4,
    });
  });

  it('rounds a partial final page up', () => {
    expect(buildPaginationMeta(1, 25, 101).totalPages).toBe(5);
  });

  it('reports zero pages for an empty result set', () => {
    expect(buildPaginationMeta(1, 25, 0).totalPages).toBe(0);
  });
});
