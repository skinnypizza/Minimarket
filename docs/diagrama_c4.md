# Diagrama C4 - Sistema Minimarket

Este documento presenta los diagramas C4 del Sistema de Gestión de Minimarket en dos niveles: Context y Container.

## Nivel 1: Context Diagram

El diagrama de contexto muestra el sistema Minimarket y cómo interactúa con los usuarios y sistemas externos.

```mermaid
C4Context
    title Diagrama de Contexto - Sistema Minimarket

    Person(admin, "Administrador", "Gestiona productos, inventario y visualiza reportes de ventas")
    Person(cliente, "Cliente", "Navega productos, gestiona carrito y realiza compras")
    
    System(minimarket, "Sistema Minimarket", "Sistema web de gestión de minimercado que permite administrar productos, inventario, ventas y carritos de compra")
    
    System_Ext(database, "PostgreSQL Database", "Almacena usuarios, productos, lotes, ventas y carritos")
    
    Rel(admin, minimarket, "Gestiona productos e inventario, visualiza KPIs", "HTTPS")
    Rel(cliente, minimarket, "Navega productos, gestiona carrito, realiza compras", "HTTPS")
    Rel(minimarket, database, "Lee y escribe datos", "TCP/PostgreSQL")
    
    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Nivel 2: Container Diagram

El diagrama de contenedores muestra los principales componentes técnicos del sistema Minimarket.

```mermaid
C4Container
    title Diagrama de Contenedores - Sistema Minimarket

    Person(admin, "Administrador", "Gestiona el sistema")
    Person(cliente, "Cliente", "Realiza compras")

    System_Boundary(minimarket_boundary, "Sistema Minimarket") {
        Container(web_app, "Aplicación Web", "Node.js, Express", "Servidor de aplicación que maneja autenticación, lógica de negocio, y renderizado de vistas EJS")
        Container(session_store, "Session Store", "connect-pg-simple", "Gestiona sesiones de usuario almacenadas en PostgreSQL")
        ContainerDb(static_assets, "Static Assets", "CSS, JS, Images", "Archivos estáticos servidos desde /public")
    }
    
    ContainerDb(database, "Base de Datos", "PostgreSQL + Sequelize ORM", "Almacena usuarios, productos, batches, ventas, carritos y sesiones")

    Rel(admin, web_app, "Gestiona productos, visualiza dashboards", "HTTPS")
    Rel(cliente, web_app, "Navega productos, gestiona carrito", "HTTPS")
    
    Rel(web_app, static_assets, "Sirve archivos estáticos")
    Rel(web_app, session_store, "Gestiona sesiones de usuario")
    Rel(web_app, database, "Lee/escribe datos usando Sequelize", "TCP/PostgreSQL")
    Rel(session_store, database, "Almacena sesiones en tabla 'sessions'", "TCP/PostgreSQL")
    
    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

## Componentes Principales

### Aplicación Web (Node.js/Express)
- **Rutas principales**:
  - `/auth` - Autenticación (login, registro, logout)
  - `/products` - Gestión de productos
  - `/cart` - Gestión de carrito de compras
  - `/api/sales` - API de ventas
  - `/api` - API general (usuarios, productos)
  - `/api/kpis` - Datos de KPIs para dashboards

- **Middleware**:
  - Autenticación de usuarios
  - Gestión de sesiones
  - Upload de archivos (Multer)

### Base de Datos PostgreSQL
- **Modelos principales**:
  - `User` - Usuarios (admin/cliente)
  - `Product` - Productos del minimercado
  - `Batch` - Lotes de productos con fechas de vencimiento
  - `Sale` - Ventas realizadas
  - `SaleProduct` - Relación many-to-many entre ventas y productos
  - `Cart` - Carritos de compra
  - `CartItem` - Items en los carritos
  - `sessions` - Tabla de sesiones (gestionada por connect-pg-simple)

### Session Store
- Utiliza `connect-pg-simple` para almacenar sesiones en PostgreSQL
- Configuración: 30 minutos de inactividad, renovación automática en cada petición
- Almacenamiento persistente en tabla `sessions`
