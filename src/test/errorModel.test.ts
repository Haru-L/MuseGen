import { describe, it, expect } from 'vitest'
import { toTaskError } from '@/services/processing/ErrorModel'

describe('ErrorModel', () => {
  it('wraps Error into TaskError', () => {
    const err = new Error('boom')
    const taskError = toTaskError(err)
    expect(taskError.code).toBe('UNKNOWN')
    expect(taskError.userMessage).toBeTruthy()
    expect(taskError.recoverable).toBe(false)
  })

  it('wraps unknown into TaskError', () => {
    const taskError = toTaskError({ any: 'thing' })
    expect(taskError.code).toBe('UNKNOWN')
    expect(taskError.userMessage).toBeTruthy()
  })
})

