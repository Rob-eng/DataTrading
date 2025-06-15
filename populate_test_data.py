#!/usr/bin/env python3
"""
Script para popular o banco de dados com dados de teste
para demonstrar os endpoints de analytics
"""

import requests
import json
from datetime import datetime, timedelta
import random

# Configurações
BASE_URL = "http://localhost"
API_BASE = f"{BASE_URL}/api/v1"

def create_robot(name):
    """Cria um robô"""
    data = {"nome": name}
    response = requests.post(f"{API_BASE}/robos/", json=data)
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Erro ao criar robô {name}: {response.text}")
        return None

def create_operation(robo_id, resultado, ativo="WINM24", tipo="COMPRA"):
    """Cria uma operação"""
    data = {
        "robo_id": robo_id,
        "resultado": resultado,
        "data_abertura": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
        "data_fechamento": (datetime.now() - timedelta(days=random.randint(0, 29))).isoformat(),
        "ativo": ativo,
        "lotes": random.uniform(1, 10),
        "tipo": tipo
    }
    response = requests.post(f"{API_BASE}/operacoes/", json=data)
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Erro ao criar operação: {response.text}")
        return None

def populate_test_data():
    """Popula o banco com dados de teste"""
    print("🚀 Iniciando população do banco com dados de teste...")
    
    # Criar robôs de teste
    robots = [
        "RoboAlfa",
        "RoboBeta", 
        "RoboGamma",
        "RoboDelta"
    ]
    
    created_robots = []
    for robot_name in robots:
        robot = create_robot(robot_name)
        if robot:
            created_robots.append(robot)
            print(f"✅ Robô criado: {robot['nome']} (ID: {robot['id']})")
    
    # Criar operações para cada robô
    ativos = ["WINM24", "WDOM24", "PETR4", "VALE3", "ITUB4"]
    tipos = ["COMPRA", "VENDA"]
    
    for robot in created_robots:
        print(f"\n📊 Criando operações para {robot['nome']}...")
        
        # Definir características do robô
        if robot['nome'] == "RoboAlfa":
            # Robô com bom desempenho
            operations = []
            for _ in range(50):
                # 70% de operações positivas
                if random.random() < 0.7:
                    resultado = random.uniform(50, 300)
                else:
                    resultado = random.uniform(-200, -30)
                operations.append(resultado)
        
        elif robot['nome'] == "RoboBeta":
            # Robô com desempenho médio
            operations = []
            for _ in range(35):
                # 55% de operações positivas
                if random.random() < 0.55:
                    resultado = random.uniform(30, 200)
                else:
                    resultado = random.uniform(-150, -20)
                operations.append(resultado)
        
        elif robot['nome'] == "RoboGamma":
            # Robô com desempenho ruim
            operations = []
            for _ in range(25):
                # 35% de operações positivas
                if random.random() < 0.35:
                    resultado = random.uniform(20, 100)
                else:
                    resultado = random.uniform(-120, -40)
                operations.append(resultado)
        
        else:  # RoboDelta
            # Robô com poucos trades mas muito bom
            operations = []
            for _ in range(15):
                # 80% de operações positivas
                if random.random() < 0.8:
                    resultado = random.uniform(100, 500)
                else:
                    resultado = random.uniform(-100, -20)
                operations.append(resultado)
        
        # Criar as operações
        operations_created = 0
        for resultado in operations:
            ativo = random.choice(ativos)
            tipo = random.choice(tipos)
            
            operation = create_operation(robot['id'], resultado, ativo, tipo)
            if operation:
                operations_created += 1
        
        print(f"   ✅ {operations_created} operações criadas para {robot['nome']}")
    
    print(f"\n🎉 População concluída!")
    print(f"📈 Agora você pode testar os endpoints de analytics:")
    print(f"   • Métricas básicas: GET {API_BASE}/analytics/metricas-basicas")
    print(f"   • Métricas avançadas: GET {API_BASE}/analytics/metricas-avancadas")
    print(f"   • Comparação de robôs: GET {API_BASE}/analytics/comparacao-robos")
    print(f"   • Análise por ativo: GET {API_BASE}/analytics/analise-por-ativo")

if __name__ == "__main__":
    populate_test_data() 