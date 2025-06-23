import React, { useState } from 'react'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import apiService from '../services/api'

interface UploadedFile {
  name: string
  size: number
  status: 'uploading' | 'success' | 'error'
  progress: number
  robot?: string
  operations?: number
  error?: string
  file?: File
}

const Upload: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedRobot, setSelectedRobot] = useState('')
  const [selectedSchema] = useState('oficial')
  const [newRobotName, setNewRobotName] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploads, setUploads] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const robots = [
    { value: '', label: 'Selecionar Robô' },
    { value: 'robo-a', label: 'RobôA' },
    { value: 'robo-b', label: 'RobôB' },
    { value: 'robo-c', label: 'RobôC' },
    { value: 'new', label: 'Criar Novo Robô' }
  ]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => ({
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
      file: file
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Upload real
    newFiles.forEach((fileData, index) => {
      uploadFile(files.length + index, fileData.file!)
    })
  }

  const uploadFile = async (fileIndex: number, file: File) => {
    try {
      // Simular progresso inicial
      setFiles(prev => {
        const updated = [...prev]
        if (updated[fileIndex]) {
          updated[fileIndex].progress = 10
        }
        return updated
      })

      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
      
      let response
      if (isExcel) {
        // Excel: detecta múltiplos robôs automaticamente, não precisa especificar robô
        response = await apiService.uploadExcel(file, undefined, undefined, selectedSchema, true)
      } else {
        // CSV: precisa especificar o robô
        const robotName = selectedRobot === 'new' ? newRobotName : (selectedRobot || undefined)
        response = await apiService.uploadCSV(file, undefined, robotName, selectedSchema)
      }

      // Atualizar status de sucesso
      setFiles(prev => {
        const updated = [...prev]
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'success'
          updated[fileIndex].progress = 100
          
          if (isExcel) {
            // Excel: múltiplos robôs processados
            const totalOperacoes = response.operacoes_salvas_total || 0
            const robosProcessados = Object.keys(response.robos_processados || {}).length
            updated[fileIndex].operations = totalOperacoes
            updated[fileIndex].robot = `${robosProcessados} robô(s) processado(s)`
          } else {
            // CSV: um robô
            const robotName = selectedRobot === 'new' ? newRobotName : (selectedRobot || undefined)
            updated[fileIndex].operations = response.operacoes_salvas || 0
            updated[fileIndex].robot = response.robo_nome || robotName || 'Processado'
          }
        }
        return updated
      })

    } catch (error: any) {
      console.error('Erro no upload:', error)
      
      let errorMessage = 'Erro no upload'
      
      if (error.response) {
        // Erro da API
        if (error.response.status === 422) {
          errorMessage = 'Dados inválidos no arquivo. Verifique o formato e colunas.'
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.detail || 'Arquivo inválido'
        } else {
          errorMessage = `Erro ${error.response.status}: ${error.response.data?.detail || 'Erro no servidor'}`
        }
      } else if (error.code === 'ECONNABORTED') {
        // Timeout
        errorMessage = 'Timeout: Arquivo muito grande ou processamento demorado'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setFiles(prev => {
        const updated = [...prev]
        if (updated[fileIndex]) {
          updated[fileIndex].status = 'error'
          updated[fileIndex].progress = 100
          updated[fileIndex].error = errorMessage
        }
        return updated
      })
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Upload CSV</h1>
      </div>

      {/* Configurações de Upload */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schema de Destino
            </label>
                          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                📊 Dados Oficiais
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Robô para CSV
            </label>
            <select 
              value={selectedRobot}
              onChange={(e) => setSelectedRobot(e.target.value)}
              className="input-field"
            >
              {robots.map(robot => (
                <option key={robot.value} value={robot.value}>
                  {robot.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Apenas para arquivos CSV (Excel detecta automaticamente)
            </p>
          </div>
          
          {selectedRobot === 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Novo Robô (CSV)
              </label>
              <input
                type="text"
                value={newRobotName}
                onChange={(e) => setNewRobotName(e.target.value)}
                placeholder="Digite o nome do robô"
                className="input-field"
              />
            </div>
          )}
          
          {selectedRobot !== 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipos de Arquivo
              </label>
              <div className="text-sm text-gray-600">
                <div>• <strong>CSV:</strong> Um robô por arquivo</div>
                <div>• <strong>Excel:</strong> Múltiplos robôs automático</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Área de Upload */}
      <div className="card">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Arraste arquivos CSV ou Excel aqui
          </h3>
          <p className="text-gray-600 mb-4">
            ou clique para selecionar arquivos (.csv, .xlsx, .xls)
          </p>
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="btn-primary cursor-pointer inline-flex items-center"
          >
            Selecionar Arquivos
          </label>
        </div>
      </div>

      {/* Lista de Arquivos */}
      {files.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Arquivos ({files.length})
          </h3>
          <div className="space-y-4">
            {files.map((file, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso */}
                {file.status === 'uploading' && (
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Processando...</span>
                      <span>{file.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Resultado do Upload */}
                {file.status === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-center space-x-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Upload concluído com sucesso!</span>
                    </div>
                    <div className="mt-2 text-sm text-green-700">
                      <p>• {file.operations} operações importadas</p>
                      <p>• Associado ao {file.robot}</p>
                    </div>
                  </div>
                )}

                {file.status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Erro no upload</span>
                    </div>
                    <p className="mt-1 text-sm text-red-700">{file.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instruções</h3>
        <div className="space-y-6">
          
          {/* Instruções para CSV */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Arquivos CSV (Um robô por arquivo)
            </h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>Formato:</strong> Um arquivo CSV = Um robô
              </p>
              <p className="text-gray-600 mb-3">
                Colunas obrigatórias: <code>Data/Abertura</code> e <code>Resultado</code>
              </p>
              <p className="text-gray-600 mb-2">Colunas opcionais:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• <strong>Ativo:</strong> Código do ativo (ex: PETR4, VALE3)</li>
                <li>• <strong>Tipo:</strong> Compra/Venda</li>
                <li>• <strong>Lotes:</strong> Quantidade</li>
                <li>• <strong>Fechamento:</strong> Data de fechamento</li>
              </ul>
            </div>
          </div>

          {/* Instruções para Excel */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Arquivos Excel (Múltiplos robôs automático)
            </h4>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>Formato:</strong> Um arquivo Excel = Múltiplos robôs
              </p>
              <p className="text-gray-600 mb-3">
                <strong>Coluna especial:</strong> <code>Robo</code>, <code>Robot</code>, <code>Setup</code> ou <code>Strategy</code>
              </p>
              <p className="text-gray-600 mb-2">
                O sistema detecta automaticamente todos os robôs diferentes na planilha e cria/associa automaticamente.
              </p>
              <div className="bg-white p-3 rounded border mt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Exemplo de estrutura:</p>
                <div className="font-mono text-xs text-gray-600">
                  Data | Robo | Ativo | Resultado<br/>
                  01/01/2024 | RoboA | PETR4 | 150.50<br/>
                  01/01/2024 | RoboB | VALE3 | -75.25<br/>
                  02/01/2024 | RoboA | ITUB4 | 200.00
                </div>
              </div>
            </div>
          </div>

          {/* Exemplo geral */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Exemplo de Linha</h4>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm">
              15/12/2023,RoboA,PETR4,Compra,100,25.50,125.50
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Upload 