#!/bin/bash

# Puertos a liberar
PORTS=(3000 3001 3002 3003 3004 3005)

echo "🔍 Buscando procesos que usan los puertos..."

for PORT in "${PORTS[@]}"; do
  # Buscar PID del proceso que usa el puerto
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PID=$(lsof -i :$PORT -t)
  else
    # Linux
    PID=$(netstat -tulpn 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)
  fi
  
  # Si se encontró un PID, matarlo
  if [ ! -z "$PID" ]; then
    echo "🔥 Matando proceso $PID en puerto $PORT"
    kill -9 $PID 2>/dev/null
  else
    echo "✅ Puerto $PORT ya está libre"
  fi
done

echo "✅ Todos los puertos han sido liberados"
