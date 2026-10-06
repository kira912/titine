import { describe, expect, it } from 'vitest'
import { critAir } from '../shared/critair'

describe('critAir', () => {
  it('classe l\'essence selon la date de mise en circulation', () => {
    expect(critAir('e10', '2019-03-14')).toBe(1)
    expect(critAir('sp98', '2011-01-01')).toBe(1)
    expect(critAir('sp95', '2010-12-31')).toBe(2)
    expect(critAir('e85', '2006-01-01')).toBe(2)
    expect(critAir('e10', '1997-01-01')).toBe(3)
    expect(critAir('sp95', '1996-12-31')).toBeNull()
  })

  it('classe le gazole un cran plus bas, jusqu\'au Crit\'Air 5', () => {
    expect(critAir('gazole', '2015-06-01')).toBe(2)
    expect(critAir('gazole', '2008-06-01')).toBe(3)
    expect(critAir('gazole', '2003-06-01')).toBe(4)
    expect(critAir('gazole', '1998-06-01')).toBe(5)
    expect(critAir('gazole', '1990-06-01')).toBeNull()
  })

  it('classe le GPL en Crit\'Air 1', () => {
    expect(critAir('gplc', '1999-01-01')).toBe(1)
  })
})
