pipeline {
    agent { 
        label 'dind' 
    }
    
    environment {
        HARBOR_IP     = '192.168.0.250'
        PROJECT       = 'picantito'
        IMAGE_NAME    = "${PROJECT}/app"
        FULL_IMAGE    = "${HARBOR_IP}/${IMAGE_NAME}:latest"
        SONAR_HOST_ACTUAL = 'http://192.168.0.250:9000'
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    checkout scm
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                dir('app') {
                    echo 'Instalando dependencias npm...'
                    sh 'npm install'
                }
            }
        }
        
        stage('Run Unit Tests') {
            steps {
                dir('app') {
                    echo 'Ejecutando pruebas unitarias...'
                    sh 'npm test'
                }
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                dir('app') {
                    echo 'Ejecutando análisis de SonarQube...'
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh """
                            npm run sonar -- \
                            -Dsonar.host.url=${SONAR_HOST_ACTUAL} \
                            -Dsonar.token=\${SONAR_TOKEN}
                        """
                    }
                }
            }
        }
        
        stage('Docker Build & Push') {
            steps {
                dir('app') {
                    script {
                        echo "Construyendo imagen Docker: ${FULL_IMAGE}"
                        sh "docker build -t ${FULL_IMAGE} ."
                        
                        echo "Iniciando sesión en Harbor..."
                        withCredentials([
                            string(credentialsId: 'DOCKER_USER', variable: 'HARBOR_USER'),
                            string(credentialsId: 'HARBOR_ADMIN_PASSWORD', variable: 'HARBOR_PASS')
                        ]) {
                            sh 'echo $HARBOR_PASS | docker login http://${HARBOR_IP} -u $HARBOR_USER --password-stdin'
                        }
                        
                        echo "Subiendo imagen a Harbor..."
                        sh "docker push ${FULL_IMAGE}"
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                sh "docker rmi ${FULL_IMAGE} || true"
            }
        }
        success {
            echo '¡Pipeline completado exitosamente!'
        }
        failure {
            echo 'Pipeline falló. Por favor revisa los logs.'
        }
    }
}
