
# Stream Clip Fav

Este proyecto es una aplicación web que permite descargar clips de YouTube utilizando Node.js, Express y ffmpeg.

## Requisitos

- Node.js (v14 o superior)
- npm (v6 o superior)
- ffmpeg
- Docker (para uso con Docker Compose)
- Docker Compose (v3.8 o superior)

## Instalación

### Clonar el repositorio

```bash
git clone https://github.com/franco-brusca/stream-clip-fav.git
cd stream-clip-fav
```

### Instalación con Node.js y npm

```bash
npm install
```

### Instalación y Uso con Docker

#### Requisitos Previos

- Asegúrate de tener Docker y Docker Compose instalados en tu sistema.

#### Levantar los Servicios con Docker Compose

1. Construye y levanta los servicios utilizando Docker Compose:
    ```bash
    docker-compose up --build
    ```

2. La aplicación estará disponible en `http://localhost:3000`.

3. Para verificar el estado de los servicios:
    ```bash
    docker-compose ps
    ```

4. Para revisar los logs de la aplicación:
    ```bash
    docker-compose logs app
    ```

5. Para detener los servicios:
    ```bash
    docker-compose down
    ```

## Uso

### Consultar info del video

Para consultar las opciones disponibles realiza una solicitud GET al endpoint `/clipInfo`

```bash
curl http://localhost:3000/clipInfo -H "Content-Type: application/json" -d '{"url": "https://youtube.com/clip/UgkxcP_zp2NSsu1ei9RUEMc_oX3a9LhWKZmq?si=_h0NFTV8olybxiq6"}'
```

### Encolar un Trabajo

Para encolar un trabajo que descargue un clip de YouTube, realiza una solicitud POST al endpoint `/enqueue`:

```bash
curl -X POST http://localhost:3000/enqueue -H "Content-Type: application/json" -d '{"url": "https://youtube.com/clip/UgkxcP_zp2NSsu1ei9RUEMc_oX3a9LhWKZmq?si=FavU3WSEx14fgKpU"}'
```

### Consultar el Estado de un Trabajo

Para consultar el estado de un trabajo, realiza una solicitud GET al endpoint `/status/:id`, reemplazando `:id` con el `jobId` recibido:

```bash
curl http://localhost:3000/status/<jobId>
```

### Descargar archivo

Para descargar el clip realiza una solicitud POST al endpoint `/download-fIle`:

```bash
curl -X POST http://localhost:3000/enqueue -H "Content-Type: application/json" -d '{"file": "/tmp/fef45e1b-473a-45c3-912e-e5ab04e89c6a.mp4"}'
```


## To-Do List

- Validar que el % esté bien seteado.
- Probar con videos de menor calidad.
- Quitar el path completo del archivo (no es seguro).
- Estandarizar los mensajes push para progress, etc.
