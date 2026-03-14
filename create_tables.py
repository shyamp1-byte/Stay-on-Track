from app.core.db import Base, engine
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.models.project_member import ProjectMember

def main():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    main()