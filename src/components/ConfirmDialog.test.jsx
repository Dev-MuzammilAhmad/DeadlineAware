import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog.jsx unit tests', () => {
  it('should render null when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render correct title, message, and button texts when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Custom Title"
        message="Custom Message Body"
        confirmText="Confirm Action Now"
        cancelText="Cancel Action Now"
      />
    )

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom Message Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Action Now' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel Action Now' })).toBeInTheDocument()
  })

  it('should trigger onConfirm and onClose when clicking the confirm button', () => {
    const onConfirmMock = vi.fn()
    const onCloseMock = vi.fn()

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirmMock).toHaveBeenCalledTimes(1)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('should trigger onClose when clicking the cancel button', () => {
    const onCloseMock = vi.fn()
    const onConfirmMock = vi.fn()

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirmMock).not.toHaveBeenCalled()
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
