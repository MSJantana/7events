pipeline {
    agent any

    environment {
        // Define common variables
        // Change this to your actual registry URL if pushing
        REGISTRY_ID = 'your-registry-id' 
        IMAGE_TAG = "build-${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend') {
            steps {
                script {
                    echo 'Building Backend Docker Image...'
                    dir('backend') {
                        // Build the backend image using the Dockerfile in the backend directory
                        // Tagging with both build number and latest
                        sh "docker build -t 7events-backend:${IMAGE_TAG} ."
                        sh "docker tag 7events-backend:${IMAGE_TAG} 7events-backend:latest"
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    echo 'Building Frontend Docker Image...'
                    dir('frontend') {
                        // Build the frontend image using the Dockerfile in the frontend directory
                        sh "docker build -t 7events-frontend:${IMAGE_TAG} ."
                        sh "docker tag 7events-frontend:${IMAGE_TAG} 7events-frontend:latest"
                    }
                }
            }
        }

        /* 
        // Uncomment and configure this stage to push images to a registry (e.g., Docker Hub, ECR)
        stage('Push Images') {
            steps {
                script {
                    withDockerRegistry([credentialsId: 'docker-hub-credentials', url: '']) {
                        sh "docker push your-repo/7events-backend:${IMAGE_TAG}"
                        sh "docker push your-repo/7events-backend:latest"
                        sh "docker push your-repo/7events-frontend:${IMAGE_TAG}"
                        sh "docker push your-repo/7events-frontend:latest"
                    }
                }
            }
        }
        */
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo 'Build Pipeline completed successfully!'
        }
        failure {
            echo 'Build Pipeline failed.'
        }
    }
}
