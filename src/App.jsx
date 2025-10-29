import { useState } from 'react'
import './App.css'
import PopUp from './componentes/pop-up'
import { 
  Brain, 
  Plus, 
  X, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle, 
  XCircle, 
  Target, 
  ClipboardList, 
  Lock, 
  Settings, 
  BarChart3,
  Calculator,
  Zap,
  FileText,
  Variable
} from 'lucide-react'

function App() {
  const [numVariables, setNumVariables] = useState(2)
  const [objectiveCoefficients, setObjectiveCoefficients] = useState([0, 0])
  const [constraints, setConstraints] = useState([{ coefficients: [0, 0], operator: '≤', value: 0 }])
  const [result, setResult] = useState(null)
  

    
  const [isLoading, setIsLoading] = useState(false)
  const [maximization, setMaximization] = useState(true)
  const [variables, setVariables] = useState([])
  

  const updateNumVariables = (newNum) => {
    const num = Math.max(1, parseInt(newNum) || 2) // Sin límite máximo de variables
    setNumVariables(num)
    
    // Resetear resultados anteriores al cambiar número de variables
    setResult(null)
    
    // Actualizar coeficientes de función objetivo
    const newObjectiveCoeffs = Array(num).fill(0)
    objectiveCoefficients.forEach((coeff, i) => {
      if (i < num) newObjectiveCoeffs[i] = coeff
    })
    setObjectiveCoefficients(newObjectiveCoeffs)
    
    // Actualizar restricciones
    const newConstraints = constraints.map(constraint => ({
      ...constraint,
      coefficients: Array(num).fill(0).map((_, i) => constraint.coefficients[i] || 0)
    }))
    setConstraints(newConstraints)
  }

  const addConstraint = () => {
    setConstraints([...constraints, { 
      coefficients: Array(numVariables).fill(0), 
      operator: '≤', 
      value: 0 
    }])
  }


  const removeConstraint = (index) => {
    if (constraints.length > 1) {
      setConstraints(constraints.filter((_, i) => i !== index))
    }
  }

  const updateObjectiveCoefficient = (index, value) => {
    const newCoeffs = [...objectiveCoefficients]
    newCoeffs[index] = parseFloat(value) || 0
    setObjectiveCoefficients(newCoeffs)
  }

  const updateConstraintCoefficient = (constraintIndex, coeffIndex, value) => {
    const newConstraints = [...constraints]
    newConstraints[constraintIndex].coefficients[coeffIndex] = parseFloat(value) || 0
    setConstraints(newConstraints)
  }

  const updateConstraintOperator = (constraintIndex, operator) => {
    const newConstraints = [...constraints]
    newConstraints[constraintIndex].operator = operator
    setConstraints(newConstraints)
  }

  const updateConstraintValue = (constraintIndex, value) => {
    const newConstraints = [...constraints]
    newConstraints[constraintIndex].value = parseFloat(value) || 0
    setConstraints(newConstraints)
  }

  const validateInputs = () => {
    // Validar que al menos un coeficiente de la función objetivo sea diferente de 0
    const hasObjective = objectiveCoefficients.some(coeff => coeff !== 0)
    if (!hasObjective) {
      return { valid: false, message: 'La función objetivo debe tener al menos un coeficiente diferente de 0' }
    }

    // Validar que todas las restricciones tengan al menos un coeficiente diferente de 0
    for (let i = 0; i < constraints.length; i++) {
      const hasCoefficient = constraints[i].coefficients.some(coeff => coeff !== 0)
      if (!hasCoefficient) {
        return { valid: false, message: `La restricción ${i + 1} debe tener al menos un coeficiente diferente de 0` }
      }
    }

    return { valid: true }
  }

  const validateConstraint = (constraint) => {
    // Validar que al menos un coeficiente sea diferente de 0
    const hasCoefficient = constraint.coefficients.some(coeff => coeff !== 0)
    return {
      isValid: hasCoefficient,
      isEmpty: constraint.coefficients.every(coeff => coeff === 0) && constraint.value === 0
    }
  }

  const generateVariableNames = (count) => {
    const names = []
    for (let i = 0; i < count; i++) {
      names.push(`x${i + 1}`) // x1, x2, x3, ...
    }
    return names
  }

  const formatObjectiveFunction = () => {
    const variables = generateVariableNames(numVariables)
    const terms = []
    
    objectiveCoefficients.forEach((coeff, i) => {
      if (coeff !== 0) {
        const sign = coeff > 0 && terms.length > 0 ? ' + ' : coeff < 0 ? ' - ' : ''
        const absCoeff = Math.abs(coeff)
        const coeffStr = absCoeff === 1 ? '' : absCoeff.toString()
        terms.push(`${sign}${coeffStr}${variables[i]}`)
      }
    })
    
    return terms.join('').replace(/^\s\+\s/, '') || '0'
  }

  const formatConstraint = (constraint) => {
    const variables = generateVariableNames(numVariables)
    const terms = []
    
    constraint.coefficients.forEach((coeff, i) => {
      if (coeff !== 0) {
        const sign = coeff > 0 && terms.length > 0 ? ' + ' : coeff < 0 ? ' - ' : ''
        const absCoeff = Math.abs(coeff)
        const coeffStr = absCoeff === 1 ? '' : absCoeff.toString()
        terms.push(`${sign}${coeffStr}${variables[i]}`)
      }
    })
    
    const leftSide = terms.join('').replace(/^\s\+\s/, '') || '0'
    return `${leftSide} ${constraint.operator} ${constraint.value}`
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones de entrada
    const validation = validateInputs()
    if (!validation.valid) {
      alert(validation.message)
      return
    }

    // Resetear el estado anterior
    setResult(null)
    setIsLoading(true)
    
    // Generar nombres de variables
    const variables = generateVariableNames(numVariables)
    
    // Función para convertir operador a tipo GLPK
    const getGLPKBoundsType = (operator) => {
      // Tipos GLPK correctos según documentación oficial
      const glpk = {
        GLP_FR: 1,    // Variable libre (sin restricciones)
        GLP_LO: 2,    // Solo lower bound (≥)
        GLP_UP: 3,    // Solo upper bound (≤)
        GLP_DB: 4,    // Double bound (≤ x ≤)
        GLP_FX: 5     // Variable fija (=)
      }
      
      switch (operator) {
        case '≤':
        case '<=':
          return glpk.GLP_UP  // Tipo 3
        case '≥':
        case '>=':
          return glpk.GLP_LO  // Tipo 2
        case '=':
          return glpk.GLP_FX  // Tipo 5
        default:
          return glpk.GLP_UP  // Tipo 3
      }
    }
    
    // Formato para GLPK
    const apiData = {
      // Variables de la función objetivo (Z)
      objective: objectiveCoefficients.map((coef, index) => ({
        name: variables[index],
        coef: coef
      })).filter(item => item.coef !== 0), // Solo incluir variables con coeficiente != 0
      
      // Restricciones en formato GLPK
      constraints: constraints.map((constraint, index) => {
        const constraintVars = constraint.coefficients.map((coef, varIndex) => ({
          name: variables[varIndex],
          coef: coef
        })).filter(item => item.coef !== 0) // Solo incluir variables con coeficiente != 0
        
        // Configurar bounds según el operador
        const glpkType = getGLPKBoundsType(constraint.operator)
        let bnds = {}
        
        switch (glpkType) {
          case 3: // GLP_UP - ≤ (Solo upper bound)
            bnds = {
              type: glpkType,
              ub: constraint.value, // upper bound
              lb: 0.0 // lower bound por defecto
            }
            break
          case 2: // GLP_LO - ≥ (Solo lower bound)
            bnds = {
              type: glpkType,
              lb: constraint.value, // lower bound
              ub: 0.0 // upper bound por defecto
            }
            break
          case 5: // GLP_FX - = (Variable fija)
            bnds = {
              type: glpkType,
              ub: constraint.value, // upper bound = lower bound
              lb: constraint.value  // para igualdad
            }
            break
        }
        
        return {
          name: `cons${index + 1}`,
          vars: constraintVars,
          bnds: bnds
        }
      }),
      
      // Metadatos adicionales
      metadata: {
        created_at: new Date().toISOString(),
        format_version: "GLPK_1.0",
        source: "linear_optimization_frontend",
        num_variables: numVariables,
        variable_names: variables,
        original_expressions: {
          objective: formatObjectiveFunction(),
          constraints: constraints.map(c => formatConstraint(c))
        }
      }
    }
    console.log('Datos para GLPK:', apiData)

    // Enviar datos a la API
    try {
      const endpoint = maximization ? '/getMaximization' : '/getMinimization'
      const response = await fetch(`https://dying-verena-k1rie-0d38db79.koyeb.app${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Respuesta de la API:', data)
      
      // Extraer información completa de la respuesta
      const apiResult = data.result?.result || {}
      const inputData = data.inputData || {}
      
      // Interpretar el status de GLPK con mensajes más descriptivos
      const getStatusMessage = (status) => {
        const statusMessages = {
          1: {
            title: 'Solución no definida',
            description: 'El problema no pudo ser procesado correctamente. Verifica que todos los datos estén completos.',
            type: 'error'
          },
          2: {
            title: 'Solución factible encontrada',
            description: 'Se encontró una solución válida, pero puede no ser la óptima.',
            type: 'warning'
          },
          3: {
            title: 'Problema infactible',
            description: 'No existe ninguna solución que satisfaga todas las restricciones. Las restricciones son contradictorias entre sí.',
            type: 'error'
          },
          4: {
            title: 'Sin solución factible',
            description: 'No se puede encontrar una solución que cumpla con todas las restricciones especificadas.',
            type: 'error'
          },
          5: {
            title: 'Solución óptima encontrada',
            description: 'Se encontró la mejor solución posible que satisface todas las restricciones.',
            type: 'success'
          },
          6: {
            title: 'Solución no acotada',
            description: 'El valor de la función objetivo puede crecer infinitamente. Verifica las restricciones.',
            type: 'error'
          }
        }
        return statusMessages[status] || {
          title: `Status desconocido (${status})`,
          description: 'Se recibió un estado no reconocido del solver.',
          type: 'error'
        }
      }
      
      const statusInfo = getStatusMessage(apiResult.status)
      
      setResult({
        maximum: apiResult.z || null,
        variables: apiResult.vars || {},
        dual: apiResult.dual || {},
        status: apiResult.status || 0,
        statusMessage: statusInfo,
        executionTime: data.result?.time || 0,
        message: data.message || 'Sin mensaje',
        iterations: data.iterations || [], // Valores de z antes de encontrar el óptimo
        optimizationType: maximization ? 'maximization' : 'minimization',
        inputData: {
          variableNames: inputData.variable_names || generateVariableNames(numVariables),
          originalExpressions: inputData.original_expressions || {
            objective: formatObjectiveFunction(),
            constraints: constraints.map(c => formatConstraint(c))
          },
          numVariables: inputData.num_variables || numVariables
        }
      })
      
    } catch (error) {
      console.error('Error en la optimización:', error)
      setResult({
        maximum: null,
        variables: {},
        status: 0,
        statusMessage: {
          title: 'Error de comunicación',
          description: 'No se pudo conectar con el servidor de optimización. Verifica tu conexión a internet e intenta nuevamente.',
          type: 'error'
        },
        executionTime: 0,
        message: `Error: ${error.message}`,
        error: true,
        iterations: [], // Array vacío en caso de error
        optimizationType: maximization ? 'maximization' : 'minimization',
        inputData: {
          variableNames: generateVariableNames(numVariables),
          originalExpressions: {
            objective: formatObjectiveFunction(),
            constraints: constraints.map(c => formatConstraint(c))
          },
          numVariables: numVariables
        }
      })
    } finally {
      setIsLoading(false)
    }

  }

  const getConstraintType = (operator) => {
    switch (operator) {
      case '≤':
      case '<=':
        return 'less_than_or_equal'
      case '≥':
      case '>=':
        return 'greater_than_or_equal'
      case '=':
        return 'equal'
      default:
        return 'unknown'
    }
  }

  // Función para generar el modelo aumentado
  const generateAugmentedModel = () => {
    if (!result || !result.inputData) return null

    const originalObjective = result.inputData.originalExpressions.objective
    
    // Contadores para variables s y e
    let sCount = 0
    let eCount = 0
    const usedVariables = []

    // Recopilar todas las variables de holgura/exceso
    constraints.forEach((constraint) => {
      if (constraint.operator === '≤') {
        sCount++
        usedVariables.push(`s${sCount}`)
      } else if (constraint.operator === '≥') {
        eCount++
        usedVariables.push(`e${eCount}`)
      } else if (constraint.operator === '=') {
        // Para igualdad, agregamos tanto s como e
        sCount++
        eCount++
        usedVariables.push(`s${sCount}`, `e${eCount}`)
      }
    })

    // Función objetivo aumentada con todas las variables de holgura
    const augmentedObjective = originalObjective + (usedVariables.length > 0 ? ' + ' + usedVariables.join(' + ') : '')

    return {
      originalObjective,
      augmentedObjective,
      usedVariables,
      sCount,
      eCount
    }
  }

  return (
    <div className="app">
      <PopUp />
      <div className="container">
        <header className="header">
          <div className="brain-icon">
            <Brain size={64} />
          </div>
          <h1>Optimización Lineal</h1>
          <p className="subtitle">Encuentra el valor {maximization ? 'máximo' : 'mínimo'} de tu función objetivo</p>
        </header>

        <div className="main-content">
          <div className="form-section">
            <form onSubmit={handleSubmit} className="optimization-form">
              {/* Selector de número de variables */}
              <div className="input-group">
                <label className="input-label">
                  <span className="label-text">Número de Variables</span>
                  <span className="label-desc">Mínimo 1 variable</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={numVariables}
                  onChange={(e) => updateNumVariables(e.target.value)}
                  className="math-input number-input"
                />
              </div>

              {/* Tipo de Optimización */}
              <div className="input-group">
                <label className="input-label">
                  <span className="label-text">Tipo de Optimización</span>
                  <span className="label-desc">Selecciona el tipo de optimización a realizar</span>
                </label>
                <div className="optimization-type-selector">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="optimizationType"
                      checked={maximization}
                      onChange={() => setMaximization(true)}
                    />
                    <span className="radio-label">Maximización</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="optimizationType"
                      checked={!maximization}
                      onChange={() => setMaximization(false)}
                    />
                    <span className="radio-label">Minimización</span>
                  </label>
                </div>
              </div>

              {/* Función Objetivo */}
              <div className="input-group">
                <label className="input-label">
                  <span className="label-text">Función Objetivo (Z)</span>
                  <span className="label-desc">{maximization ? 'Maximizar' : 'Minimizar'} Z = {formatObjectiveFunction()}</span>
                </label>
                <div className="coefficients-row">
                  {objectiveCoefficients.map((coeff, index) => (
                    <div key={index} className="coefficient-group">
                      <label className="variable-label">
                        {generateVariableNames(numVariables)[index]}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={coeff}
                        onChange={(e) => updateObjectiveCoefficient(index, e.target.value)}
                        className="math-input coefficient-input"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Restricciones */}
              <div className="constraints-section">
                <div className="section-header">
                  <div className="section-title">
                    <span className="label-text">Restricciones</span>
                    <span className="constraints-count">({constraints.length} restricción{constraints.length !== 1 ? 'es' : ''})</span>
                  </div>
                  <button
                    type="button"
                    onClick={addConstraint}
                    className="add-constraint-btn"
                  >
                    <Plus size={18} />
                    <span className="btn-text">Nueva Restricción</span>
                  </button>
                </div>
                
                <div className="constraints-list">
                  {constraints.map((constraint, constraintIndex) => {
                    const validation = validateConstraint(constraint)
                    return (
                      <div key={constraintIndex} className={`constraint-card ${!validation.isValid ? 'constraint-invalid' : ''} ${validation.isEmpty ? 'constraint-empty' : ''}`}>
                        <div className="constraint-header">
                          <div className="constraint-number">
                            <span className="constraint-label">R{constraintIndex + 1}</span>
                            {!validation.isValid && (
                              <AlertCircle size={16} className="validation-indicator" title="Restricción incompleta" />
                            )}
                          </div>
                          <div className="constraint-preview-header">
                            {formatConstraint(constraint)}
                          </div>
                          {constraints.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeConstraint(constraintIndex)}
                              className="remove-constraint-btn"
                              title="Eliminar restricción"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      
                      <div className="constraint-inputs">
                        <div className="coefficients-section">
                          <div className="coefficients-label">Coeficientes:</div>
                          <div className="coefficients-grid">
                            {constraint.coefficients.map((coeff, coeffIndex) => (
                              <div key={coeffIndex} className="coefficient-input-group">
                                <label className="variable-label-small">
                                  {generateVariableNames(numVariables)[coeffIndex]}
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={coeff}
                                  onChange={(e) => updateConstraintCoefficient(constraintIndex, coeffIndex, e.target.value)}
                                  className="math-input coefficient-input-small"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="operator-section">
                          <div className="operator-label">Operador:</div>
                          <select
                            value={constraint.operator}
                            onChange={(e) => updateConstraintOperator(constraintIndex, e.target.value)}
                            className="math-input operator-select-improved"
                          >
                            <option value="≤">≤ (menor o igual)</option>
                            <option value="≥">≥ (mayor o igual)</option>
                            <option value="=">=  (igual)</option>
                          </select>
                        </div>
                        
                        <div className="value-section">
                          <div className="value-label">Valor:</div>
                          <input
                            type="number"
                            step="any"
                            value={constraint.value}
                            onChange={(e) => updateConstraintValue(constraintIndex, e.target.value)}
                            className="math-input value-input-improved"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>

              <div className="button-group">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="solve-btn"
                >
                  {isLoading ? 'Calculando...' : 'Resolver Optimización'}
                </button>
                
               
              </div>
            </form>
          </div>

          {result && (
            <div className="result-section">
              <h3>Resultado de la Optimización</h3>
              <div className="result-card" data-error={result.error || false}>
                {/* Status y mensaje principal mejorado */}
                <div className={`result-status-enhanced ${result.statusMessage.type}`}>
                  <div className="status-header">
                    <div className="status-icon">
                      {result.statusMessage.type === 'success' && <CheckCircle size={32} />}
                      {result.statusMessage.type === 'error' && <XCircle size={32} />}
                      {result.statusMessage.type === 'warning' && <AlertTriangle size={32} />}
                    </div>
                    <div className="status-info">
                      <h4 className="status-title">{result.statusMessage.title}</h4>
                      <p className="status-description">{result.statusMessage.description}</p>
                    </div>
                  </div>
                  <div className="execution-time">
                    Tiempo de ejecución: {(result.executionTime * 1000).toFixed(2)} ms
                  </div>
                </div>

                {/* Resumen completo del problema cuando hay solución óptima */}
                {result.status === 5 && (
                  <div className="solution-summary">
                    <h4><BarChart3 size={24} className="inline-icon" /> Resumen Completo de la Solución</h4>
                    <div className="summary-grid">
                      <div className="summary-card">
                        <h5><Target size={20} /> Función Objetivo</h5>
                        <p><strong>Tipo:</strong> {result.optimizationType === 'maximization' ? 'Maximización' : 'Minimización'}</p>
                        <p><strong>Expresión:</strong> Z = {result.inputData.originalExpressions.objective}</p>
                        <p><strong>Valor Óptimo:</strong> <span className="optimal-value-highlight">Z = {result.maximum}</span></p>
                      </div>
                      
                      <div className="summary-card">
                        <h5><Calculator size={20} /> Variables de Decisión</h5>
                        {Object.entries(result.variables).map(([variable, value]) => (
                          <p key={variable}><strong>{variable}:</strong> {value}</p>
                        ))}
                      </div>
                      
                      <div className="summary-card">
                        <h5><ClipboardList size={20} /> Restricciones Utilizadas</h5>
                        <p><strong>Total:</strong> {result.inputData.originalExpressions.constraints.length} restricciones</p>
                        {result.inputData.originalExpressions.constraints.map((constraint, index) => (
                          <p key={index} className="constraint-summary">R{index + 1}: {constraint}</p>
                        ))}
                      </div>
                      
                      <div className="summary-card">
                        <h5><Settings size={20} /> Detalles del Proceso</h5>
                        <p><strong>Variables totales:</strong> {result.inputData.numVariables}</p>
                        <p><strong>Iteraciones:</strong> {result.iterations.length}</p>
                        <p><strong>Método:</strong> Algoritmo Simplex (GLPK)</p>
                        <p><strong>Estado:</strong> Solución óptima verificada</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Valor óptimo */}
                <div className="result-item">
                  <span className="result-label">Valor Óptimo (Z):</span>
                  <span className="result-value optimal-value">{result.maximum}</span>
                </div>

                {/* Variables de decisión */}
                <div className="variables-section">
                  <h4>Variables de Decisión</h4>
                  <div className="variables-grid">
                    {Object.entries(result.variables).map(([variable, value]) => (
                      <div key={variable} className="variable-item">
                        <span className="variable-name">{variable}</span>
                        <span className="variable-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla de Iteraciones */}
                {result.iterations && result.iterations.length > 0 && (
                  <div className="iterations-section">
                    <h4>Iteraciones del Algoritmo</h4>
                    <p className="iterations-description">
                      Valores de Z antes de encontrar el valor óptimo:
                    </p>
                    <div className="iterations-table-container">
                      <table className="iterations-table">
                        <thead>
                          <tr>
                            <th>Iteración</th>
                            <th>Valor de Z</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.iterations.map((zValue, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td className="z-value">{zValue}</td>
                            </tr>
                          ))}
                          <tr className="optimal-row">
                            <td><strong>Óptimo</strong></td>
                            <td className="z-value optimal"><strong>{result.maximum}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {/* Modelo aumentado */}
                {result.inputData && (
                  <div className="augmented-model">
                    <h4>Modelo Aumentado</h4>
                    {(() => {
                      const augmentedModel = generateAugmentedModel()
                      if (!augmentedModel) return null
                      
                      return (
                        <div className="augmented-content">
                          <div className="summary-item">
                            <strong>Función Objetivo Original:</strong>
                            <span className="objective-text">{result.optimizationType === 'maximization' ? 'Maximizar' : 'Minimizar'} Z = {augmentedModel.originalObjective}</span>
                          </div>
                          
                          <div className="summary-item">
                            <strong>Función Objetivo Aumentada:</strong>
                            <span className="objective-text augmented-objective">{result.optimizationType === 'maximization' ? 'Maximizar' : 'Minimizar'} Z = {augmentedModel.augmentedObjective}</span>
                          </div>
                          
                          <div className="summary-item">
                            <strong>Variables de Holgura/Exceso Agregadas:</strong>
                            <span className="variables-text">
                              {augmentedModel.usedVariables.length > 0 
                                ? augmentedModel.usedVariables.join(' + ') 
                                : 'Ninguna'}
                            </span>
                          </div>
                          
                          <div className="summary-item">
                            <strong>Conteo de Variables:</strong>
                            <span className="count-text">
                              Variables s: {augmentedModel.sCount}, Variables e: {augmentedModel.eCount}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Problema original */}
                {result.inputData && (
                  <div className="problem-summary">
                    <h4>Resumen del Problema</h4>
                    <div className="summary-item">
                      <strong>Función Objetivo:</strong> 
                      <span className="objective-text">{result.optimizationType === 'maximization' ? 'Maximizar' : 'Minimizar'} Z = {result.inputData.originalExpressions.objective}</span>
                    </div>
                    <div className="summary-item">
                      <strong>Restricciones:</strong>
                      <ul className="constraints-list">
                        {result.inputData.originalExpressions.constraints.map((constraint, index) => (
                          <li key={index} className="constraint-text">{constraint}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="summary-item">
                      <strong>Variables:</strong> {result.inputData.variableNames.join(', ')}
                    </div>
                  </div>
                )}

                <p className="api-message">{result.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="info-section">
          <div className="info-card">
            <h4>Instrucciones de Uso</h4>
            <ul>
              <li><strong>Variables:</strong> Se generan automáticamente (x1, x2, x3, ...)</li>
              <li><strong>Coeficientes:</strong> Ingresa números decimales o enteros</li>
              <li><strong>Restricciones:</strong> Usa ≤, ≥ o = según corresponda</li>
              <li><strong>Formato:</strong> Los datos se validan automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
