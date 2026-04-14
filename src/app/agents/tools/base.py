from abc import ABC, abstractmethod


class BaseTool(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name that matches the regex ^[a-zA-Z0-9_-]{1,64}$"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Detailed description of what the tool does"""
        pass

    @property
    @abstractmethod
    def input_schema(self) -> dict:
        """JSON Schema defining the expected parameters"""
        pass

    @abstractmethod
    def execute(self, **kwargs) -> str:
        """Execute the tool with given parameters"""
        pass


"""
The `@property` and `@abstractmethod` decorators in Python serve distinct yet complementary
purposes in object-oriented design. The `@property` decorator allows methods to be accessed like attributes,
enabling logic to be executed when getting, setting, or deleting values, making code more readable and
Pythonic. On the other hand, `@abstractmethod`, defined in the `abc` module, is used in abstract base
classes to define methods or properties that subclasses must implement, enforcing a consistent interface.
Together, they enable the creation of flexible and robust class hierarchies by combining intuitive
attribute access with strict implementation requirements for derived classes."""
