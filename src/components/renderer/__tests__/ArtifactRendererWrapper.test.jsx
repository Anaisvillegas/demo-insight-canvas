/**
 * ArtifactRendererWrapper.test.jsx
 * 
 * Tests completos para el ArtifactRendererWrapper
 * Incluye tests de renderizado, estados, eventos y integración
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArtifactRendererWrapper from '../ArtifactRendererWrapper'
import { FEATURE_FLAGS } from '../../../config/featureFlags'

// Mock del OptimizedArtifactRenderer
const mockRenderer = {
  init: jest.fn().mockResolvedValue(true),
  render: jest.fn().mockResolvedValue({
    success: true,
    html: '<div>Rendered content</div>',
    performance: { renderTime: 100 },
  }),
  cleanup: jest.fn(),
  getStats: jest.fn(() => ({
    performance: { averageRenderTime: 100 },
    cache: { hits: 5, misses: 2 },
  })),
  isInitialized: true,
}

jest.mock('../OptimizedArtifactRenderer', () => ({
  OptimizedArtifactRenderer: jest.fn().mockImplementation(() => mockRenderer),
}))

// Mock del SelectionTool
jest.mock('../../../components/selection-tool', () => ({
  SelectionTool: function MockSelectionTool({ onSelect, targetRef }) {
    return (
      <div data-testid="selection-tool">
        <button
          onClick={() => onSelect?.({ selectionImg: 'selection.png', artifactImg: 'artifact.png' })}
        >
          Capture
        </button>
      </div>
    )
  }
}))

// Mock de react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, ...props }) => (
    <pre data-testid="syntax-highlighter" {...props}>
      {children}
    </pre>
  ),
}))

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}))

describe('ArtifactRendererWrapper', () => {
  const defaultProps = {
    code: '<div>Test content</div>',
    type: 'html',
    mode: 'preview',
    recording: false,
    onCapture: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRenderer.render.mockResolvedValue({
      success: true,
      html: '<div>Rendered content</div>',
      performance: { renderTime: 100 },
    })
  })

  describe('Renderizado Básico', () => {
    test('debe renderizarse correctamente con props por defecto', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      expect(screen.getByTestId('artifact-renderer-wrapper')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByTestId('artifact-content')).toBeInTheDocument()
      })
    })

    test('debe mostrar loading state inicialmente', () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('Renderizando artefacto...')).toBeInTheDocument()
    })

    test('debe renderizar contenido después de la carga', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
        expect(screen.getByTestId('artifact-content')).toBeInTheDocument()
      })
    })

    test('debe aplicar clases CSS correctas', () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      const wrapper = screen.getByTestId('artifact-renderer-wrapper')
      expect(wrapper).toHaveClass('relative', 'w-full', 'h-full')
    })
  })

  describe('Modos de Renderizado', () => {
    test('debe renderizar en modo preview por defecto', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} mode="preview" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('artifact-content')).toBeInTheDocument()
        expect(screen.queryByTestId('syntax-highlighter')).not.toBeInTheDocument()
      })
    })

    test('debe renderizar en modo code', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} mode="code" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
        expect(screen.queryByTestId('artifact-content')).not.toBeInTheDocument()
      })
    })

    test('debe cambiar entre modos dinámicamente', async () => {
      const { rerender } = render(
        <ArtifactRendererWrapper {...defaultProps} mode="preview" />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('artifact-content')).toBeInTheDocument()
      })
      
      rerender(<ArtifactRendererWrapper {...defaultProps} mode="code" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument()
      })
    })
  })

  describe('Tipos de Contenido', () => {
    test('debe renderizar contenido HTML', async () => {
      render(
        <ArtifactRendererWrapper
          {...defaultProps}
          type="html"
          code="<div>HTML content</div>"
        />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledWith(
          '<div>HTML content</div>',
          expect.any(Object)
        )
      })
    })

    test('debe renderizar contenido React', async () => {
      const reactCode = 'const App = () => <div>React component</div>'
      
      render(
        <ArtifactRendererWrapper
          {...defaultProps}
          type="react"
          code={reactCode}
        />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledWith(
          reactCode,
          expect.any(Object)
        )
      })
    })

    test('debe manejar contenido vacío', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} code="" />)
      
      await waitFor(() => {
        expect(screen.getByText('No hay contenido para mostrar')).toBeInTheDocument()
      })
    })

    test('debe detectar tipo automáticamente cuando no se especifica', async () => {
      render(
        <ArtifactRendererWrapper
          {...defaultProps}
          code="<div>Auto-detect</div>"
          type={undefined}
        />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalled()
      })
    })
  })

  describe('Manejo de Estados', () => {
    test('debe mostrar estado de error cuando falla el renderizado', async () => {
      mockRenderer.render.mockResolvedValueOnce({
        success: false,
        error: 'Render failed',
      })
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
        expect(screen.getByText(/Error al renderizar/)).toBeInTheDocument()
        expect(screen.getByText('Render failed')).toBeInTheDocument()
      })
    })

    test('debe mostrar botón de reintentar en estado de error', async () => {
      mockRenderer.render.mockResolvedValueOnce({
        success: false,
        error: 'Render failed',
      })
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
    })

    test('debe reintentar renderizado al hacer click en reintentar', async () => {
      mockRenderer.render
        .mockResolvedValueOnce({
          success: false,
          error: 'Render failed',
        })
        .mockResolvedValueOnce({
          success: true,
          html: '<div>Success on retry</div>',
        })
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Reintentar'))
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledTimes(2)
        expect(screen.getByTestId('artifact-content')).toBeInTheDocument()
      })
    })

    test('debe manejar múltiples cambios de código', async () => {
      const { rerender } = render(
        <ArtifactRendererWrapper {...defaultProps} code="<div>First</div>" />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledTimes(1)
      })
      
      rerender(
        <ArtifactRendererWrapper {...defaultProps} code="<div>Second</div>" />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Funcionalidad de Captura', () => {
    test('debe mostrar SelectionTool cuando recording es true', () => {
      render(<ArtifactRendererWrapper {...defaultProps} recording={true} />)
      
      expect(screen.getByTestId('selection-tool')).toBeInTheDocument()
    })

    test('debe ocultar SelectionTool cuando recording es false', () => {
      render(<ArtifactRendererWrapper {...defaultProps} recording={false} />)
      
      expect(screen.queryByTestId('selection-tool')).not.toBeInTheDocument()
    })

    test('debe llamar onCapture cuando se hace captura', async () => {
      const onCapture = jest.fn()
      
      render(
        <ArtifactRendererWrapper
          {...defaultProps}
          recording={true}
          onCapture={onCapture}
        />
      )
      
      fireEvent.click(screen.getByText('Capture'))
      
      expect(onCapture).toHaveBeenCalledWith({
        selectionImg: 'selection.png',
        artifactImg: 'artifact.png',
      })
    })

    test('debe manejar captura sin onCapture definido', async () => {
      render(
        <ArtifactRendererWrapper
          {...defaultProps}
          recording={true}
          onCapture={undefined}
        />
      )
      
      expect(() => {
        fireEvent.click(screen.getByText('Capture'))
      }).not.toThrow()
    })
  })

  describe('Performance y Optimización', () => {
    test('debe memoizar el renderizado cuando el código no cambia', async () => {
      const { rerender } = render(
        <ArtifactRendererWrapper {...defaultProps} code="<div>Same code</div>" />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledTimes(1)
      })
      
      // Re-render con las mismas props
      rerender(
        <ArtifactRendererWrapper {...defaultProps} code="<div>Same code</div>" />
      )
      
      // No debería llamar render nuevamente
      expect(mockRenderer.render).toHaveBeenCalledTimes(1)
    })

    test('debe re-renderizar cuando cambia el tipo', async () => {
      const { rerender } = render(
        <ArtifactRendererWrapper {...defaultProps} type="html" />
      )
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledTimes(1)
      })
      
      rerender(<ArtifactRendererWrapper {...defaultProps} type="react" />)
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledTimes(2)
      })
    })

    test('debe mostrar métricas de performance en desarrollo', async () => {
      process.env.NODE_ENV = 'development'
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        // En desarrollo, debería mostrar información de performance
        expect(screen.queryByTestId('performance-info')).toBeInTheDocument()
      })
      
      process.env.NODE_ENV = 'test'
    })
  })

  describe('Cleanup y Gestión de Memoria', () => {
    test('debe limpiar recursos al desmontarse', async () => {
      const { unmount } = render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockRenderer.init).toHaveBeenCalled()
      })
      
      unmount()
      
      expect(mockRenderer.cleanup).toHaveBeenCalled()
    })

    test('debe manejar cleanup múltiple sin errores', async () => {
      const { unmount } = render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockRenderer.init).toHaveBeenCalled()
      })
      
      // Simular múltiples cleanups
      unmount()
      
      expect(() => {
        mockRenderer.cleanup()
        mockRenderer.cleanup()
      }).not.toThrow()
    })

    test('debe limpiar event listeners', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      const { unmount } = render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockRenderer.init).toHaveBeenCalled()
      })
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalled()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Integración con Feature Flags', () => {
    test('debe usar renderer optimizado cuando está habilitado', async () => {
      // Mock feature flag habilitado
      jest.doMock('@/src/config/featureFlags', () => ({
        FEATURE_FLAGS: {
          OPTIMIZED_RENDERER: true,
        },
      }))
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockRenderer.init).toHaveBeenCalled()
      })
    })

    test('debe funcionar con feature flags deshabilitados', async () => {
      // Mock feature flag deshabilitado
      jest.doMock('@/src/config/featureFlags', () => ({
        FEATURE_FLAGS: {
          OPTIMIZED_RENDERER: false,
        },
      }))
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      // Debería seguir funcionando, posiblemente con fallback
      await waitFor(() => {
        expect(screen.getByTestId('artifact-renderer-wrapper')).toBeInTheDocument()
      })
    })
  })

  describe('Accesibilidad', () => {
    test('debe tener atributos ARIA apropiados', () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      const wrapper = screen.getByTestId('artifact-renderer-wrapper')
      expect(wrapper).toHaveAttribute('role', 'region')
      expect(wrapper).toHaveAttribute('aria-label', 'Artifact Renderer')
    })

    test('debe ser navegable por teclado', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      const wrapper = screen.getByTestId('artifact-renderer-wrapper')
      expect(wrapper).toHaveAttribute('tabIndex', '0')
    })

    test('debe anunciar cambios de estado a screen readers', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        const statusElement = screen.getByRole('status')
        expect(statusElement).toBeInTheDocument()
      })
    })
  })

  describe('Casos Edge', () => {
    test('debe manejar código muy largo', async () => {
      const longCode = '<div>' + 'x'.repeat(100000) + '</div>'
      
      render(<ArtifactRendererWrapper {...defaultProps} code={longCode} />)
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledWith(
          longCode,
          expect.any(Object)
        )
      })
    })

    test('debe manejar caracteres especiales en el código', async () => {
      const specialCode = '<div>Ñoño 中文 🚀 "quotes" \'apostrophes\'</div>'
      
      render(<ArtifactRendererWrapper {...defaultProps} code={specialCode} />)
      
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalledWith(
          specialCode,
          expect.any(Object)
        )
      })
    })

    test('debe manejar props undefined', async () => {
      render(
        <ArtifactRendererWrapper
          code={undefined}
          type={undefined}
          mode={undefined}
          recording={undefined}
          onCapture={undefined}
        />
      )
      
      // No debería crashear
      expect(screen.getByTestId('artifact-renderer-wrapper')).toBeInTheDocument()
    })

    test('debe manejar cambios rápidos de props', async () => {
      const { rerender } = render(
        <ArtifactRendererWrapper {...defaultProps} code="<div>1</div>" />
      )
      
      // Cambios rápidos
      for (let i = 2; i <= 10; i++) {
        rerender(
          <ArtifactRendererWrapper {...defaultProps} code={`<div>${i}</div>`} />
        )
      }
      
      // Debería manejar todos los cambios sin errores
      await waitFor(() => {
        expect(mockRenderer.render).toHaveBeenCalled()
      })
    })

    test('debe manejar errores de inicialización del renderer', async () => {
      mockRenderer.init.mockRejectedValueOnce(new Error('Init failed'))
      
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
        expect(screen.getByText(/Error al inicializar/)).toBeInTheDocument()
      })
    })
  })

  describe('Eventos Personalizados', () => {
    test('debe emitir evento onRenderComplete', async () => {
      const onRenderComplete = jest.fn()
      
      render(
        <ArtifactRendererWrapper
          {...defaultProps}
          onRenderComplete={onRenderComplete}
        />
      )
      
      await waitFor(() => {
        expect(onRenderComplete).toHaveBeenCalledWith({
          success: true,
          renderTime: 100,
        })
      })
    })

    test('debe emitir evento onError cuando falla', async () => {
      const onError = jest.fn()
      mockRenderer.render.mockResolvedValueOnce({
        success: false,
        error: 'Render failed',
      })
      
      render(
        <ArtifactRendererWrapper {...defaultProps} onError={onError} />
      )
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Render failed')
      })
    })

    test('debe manejar eventos sin callbacks definidos', async () => {
      render(<ArtifactRendererWrapper {...defaultProps} />)
      
      // No debería crashear sin callbacks
      await waitFor(() => {
        expect(screen.getByTestId('artifact-content')).toBeInTheDocument()
      })
    })
  })
})
