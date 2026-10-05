import { useState, useEffect, useCallback } from 'react'
import type { Customer } from '@/types'
import type { CustomerFormData } from '@/schemas'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  receivePayment,
} from '@/services/sqlite.service'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCustomers()
      setCustomers(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const addCustomer = useCallback(
    async (formData: CustomerFormData): Promise<Customer> => {
      setError(null)
      try {
        const created = await createCustomer(formData)
        setCustomers((prev) => [created, ...prev])
        return created
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw new Error(message)
      }
    },
    []
  )

  const editCustomer = useCallback(
    async (customer: Customer): Promise<Customer> => {
      setError(null)
      try {
        const updated = await updateCustomer(customer)
        setCustomers((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        )
        return updated
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw new Error(message)
      }
    },
    []
  )

  const removeCustomer = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null)
      try {
        await deleteCustomer(id)
        setCustomers((prev) => prev.filter((c) => c.id !== id))
        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw new Error(message)
      }
    },
    []
  )

  const recordPayment = useCallback(
    async (payment: {
      customerId: string
      amount: number
      paymentMethod: string
      notes?: string
    }): Promise<string> => {
      setError(null)
      try {
        const paymentId = await receivePayment(payment)
        // Refresh customer data to update balances
        await loadCustomers()
        return paymentId
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw new Error(message)
      }
    },
    [loadCustomers]
  )

  return {
    customers,
    isLoading,
    error,
    refresh: loadCustomers,
    addCustomer,
    editCustomer,
    removeCustomer,
    recordPayment,
  }
}
